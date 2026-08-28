[CmdletBinding()]
param(
    [string]$Serial,
    [switch]$SkipApp,
    [ValidateSet('all', 'shizuku-auth', 'accessibility-grant', 'phigros-advisor', 'gacha-analysis', 'none')]
    [string]$Plugins = 'all'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$workspaceRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$artifactDirectory = Join-Path $workspaceRoot 'artifacts'
$debugTool = Join-Path $workspaceRoot 'app\tools\adb-debug.ps1'

function Find-Adb {
    $command = Get-Command adb -ErrorAction SilentlyContinue
    if ($null -ne $command) {
        return $command.Source
    }
    $localProperties = Join-Path $workspaceRoot 'app\local.properties'
    if (Test-Path -LiteralPath $localProperties) {
        $sdkLine = Get-Content -LiteralPath $localProperties |
            Where-Object { $_ -like 'sdk.dir=*' } |
            Select-Object -First 1
        if ($sdkLine) {
            $sdk = $sdkLine.Substring('sdk.dir='.Length).Replace('/', '\')
            $candidate = Join-Path $sdk 'platform-tools\adb.exe'
            if (Test-Path -LiteralPath $candidate) {
                return $candidate
            }
        }
    }
    throw '找不到 adb。请把 Android SDK platform-tools 加入 PATH，或配置 app/local.properties。'
}

function Invoke-Adb([string[]]$Arguments) {
    Write-Host "> adb $($Arguments -join ' ')" -ForegroundColor Cyan
    & $script:adb @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "adb 命令失败，退出码 $LASTEXITCODE"
    }
}

$adb = Find-Adb
if (-not $Serial) {
    $physicalDevices = @(& $adb devices |
        Select-Object -Skip 1 |
        ForEach-Object {
            if ($_ -match '^([^\s]+)\s+device(?:\s|$)' -and $Matches[1] -notlike 'emulator-*') {
                $Matches[1]
            }
        })
    if ($physicalDevices.Count -eq 0) {
        throw 'ADB 没有连接状态为 device 的实体设备。'
    }
    if ($physicalDevices.Count -gt 1) {
        throw "检测到多个实体设备：$($physicalDevices -join ', ')。请通过 -Serial 指定。"
    }
    $Serial = $physicalDevices[0]
}

Invoke-Adb @('-s', $Serial, 'get-state')

if (-not $SkipApp) {
    $apk = Join-Path $artifactDirectory 'android-tool-suite-debug.apk'
    if (-not (Test-Path -LiteralPath $apk)) {
        throw "找不到主体产物：$apk。请先运行 .\tools\build-all.ps1。"
    }
    Invoke-Adb @('-s', $Serial, 'install', '-r', '-t', $apk)
}

$pluginNames = switch ($Plugins) {
    'all' { @('shizuku-auth', 'accessibility-grant', 'phigros-advisor', 'gacha-analysis') }
    'none' { @() }
    default { @($Plugins) }
}
foreach ($pluginName in $pluginNames) {
    $pluginFile = Join-Path $artifactDirectory "$pluginName.atsplugin"
    if (-not (Test-Path -LiteralPath $pluginFile)) {
        throw "找不到插件产物：$pluginFile。请先运行 .\tools\build-all.ps1。"
    }
    # 集成工作区会在一个正式 versionCode 内反复产出 Debug 包；显式走 Debug-only
    # 同版本原子替换，避免为了设备复核占用发布版本号或先删除插件数据。
    & $debugTool -Serial $Serial -Command import-plugin -PluginFile $pluginFile -ReplaceSameVersion
    if ($LASTEXITCODE -ne 0) {
        throw "插件导入失败：$pluginName"
    }
}

Write-Host "最新产物已安装到目标设备 $Serial。若这是实体设备，请继续进行真机手动验收。" -ForegroundColor Green
