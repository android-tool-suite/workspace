[CmdletBinding()]
param(
    [switch]$NoClean,
    [switch]$SkipTests,
    [string]$GradleExecutable = 'gradle'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspaceRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$appRoot = Join-Path $workspaceRoot 'app'
$accessibilityRoot = Join-Path $workspaceRoot 'plugins\accessibility-grant'
$phigrosRoot = Join-Path $workspaceRoot 'plugins\phigros-advisor'
$sdkRepository = Join-Path $appRoot 'plugin-sdk\build\repository'
$stagingDirectory = Join-Path $workspaceRoot 'build\distribution-staging'
$outputDirectory = Join-Path $workspaceRoot 'artifacts'

function Assert-WorkspaceLayout {
    $required = @(
        (Join-Path $appRoot 'settings.gradle'),
        (Join-Path $accessibilityRoot 'settings.gradle'),
        (Join-Path $phigrosRoot 'settings.gradle')
    )
    foreach ($path in $required) {
        if (-not (Test-Path -LiteralPath $path)) {
            throw "缺少子模块文件：$path。请先运行 git submodule update --init --recursive。"
        }
    }
}

function Invoke-Native([string]$FilePath, [string[]]$Arguments) {
    Write-Host "`n> $FilePath $($Arguments -join ' ')" -ForegroundColor Cyan
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "命令失败，退出码 ${LASTEXITCODE}：$FilePath $($Arguments -join ' ')"
    }
}

function Get-NativeOutput([string]$FilePath, [string[]]$Arguments) {
    $output = & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "命令失败，退出码 ${LASTEXITCODE}：$FilePath $($Arguments -join ' ')"
    }
    return ($output -join "`n").Trim()
}

function Reset-SafeDirectory([string]$Path) {
    $fullPath = [IO.Path]::GetFullPath($Path)
    $workspacePrefix = $workspaceRoot.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($workspacePrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "拒绝清理工作区之外的目录：$fullPath"
    }
    if (Test-Path -LiteralPath $fullPath) {
        Remove-Item -LiteralPath $fullPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
}

function Assert-PluginPackage([string]$Path) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $names = @($archive.Entries | ForEach-Object { $_.FullName })
        foreach ($requiredEntry in @('manifest.json', 'plugin.apk')) {
            if ($requiredEntry -notin $names) {
                throw "插件包缺少 $requiredEntry：$Path"
            }
        }
    }
    finally {
        $archive.Dispose()
    }
}

Assert-WorkspaceLayout
$gradle = Get-Command $GradleExecutable -ErrorAction SilentlyContinue
if ($null -eq $gradle) {
    throw "找不到 Gradle：$GradleExecutable。请安装 Gradle 8.9+ 并加入 PATH。"
}

$buildTasks = if ($NoClean) { @('collectArtifacts') } else { @('clean', 'collectArtifacts') }

Invoke-Native $gradle.Source (@('-p', $appRoot) + $buildTasks)
Invoke-Native $gradle.Source @(
    '-p', $appRoot,
    ':plugin-sdk:publishReleasePublicationToPluginSdkRepository'
)

$sdkProperty = "-PatsSdkRepository=$sdkRepository"
Invoke-Native $gradle.Source (@('-p', $accessibilityRoot, $sdkProperty) + $buildTasks)
if (-not $SkipTests) {
    Invoke-Native $gradle.Source @('-p', $phigrosRoot, $sdkProperty, 'testDebugUnitTest')
}
Invoke-Native $gradle.Source (@('-p', $phigrosRoot, $sdkProperty) + $buildTasks)

$artifacts = @(
    [pscustomobject]@{
        Name = 'android-tool-suite-debug.apk'
        Source = Join-Path $appRoot 'artifacts\android-tool-suite-debug.apk'
    },
    [pscustomobject]@{
        Name = 'accessibility-grant.atsplugin'
        Source = Join-Path $accessibilityRoot 'artifacts\accessibility-grant.atsplugin'
    },
    [pscustomobject]@{
        Name = 'phigros-advisor.atsplugin'
        Source = Join-Path $phigrosRoot 'artifacts\phigros-advisor.atsplugin'
    }
)

Reset-SafeDirectory $stagingDirectory
foreach ($artifact in $artifacts) {
    if (-not (Test-Path -LiteralPath $artifact.Source)) {
        throw "构建成功但找不到产物：$($artifact.Source)"
    }
    $destination = Join-Path $stagingDirectory $artifact.Name
    Copy-Item -LiteralPath $artifact.Source -Destination $destination -Force
    if ($artifact.Name.EndsWith('.atsplugin', [StringComparison]::OrdinalIgnoreCase)) {
        Assert-PluginPackage $destination
    }
}

$hashLines = foreach ($artifact in $artifacts) {
    $hash = Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $stagingDirectory $artifact.Name)
    "$($hash.Hash)  $($artifact.Name)"
}
$hashLines | Set-Content -LiteralPath (Join-Path $stagingDirectory 'SHA256SUMS.txt') -Encoding utf8

$manifestArtifacts = foreach ($artifact in $artifacts) {
    $path = Join-Path $stagingDirectory $artifact.Name
    $file = Get-Item -LiteralPath $path
    $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $path
    [ordered]@{
        name = $artifact.Name
        size = $file.Length
        sha256 = $hash.Hash
    }
}
$manifest = [ordered]@{
    generatedAt = [DateTimeOffset]::Now.ToString('o')
    commits = [ordered]@{
        app = Get-NativeOutput 'git' @('-c', "safe.directory=$appRoot", '-C', $appRoot, 'rev-parse', 'HEAD')
        accessibilityGrant = Get-NativeOutput 'git' @('-c', "safe.directory=$accessibilityRoot", '-C', $accessibilityRoot, 'rev-parse', 'HEAD')
        phigrosAdvisor = Get-NativeOutput 'git' @('-c', "safe.directory=$phigrosRoot", '-C', $phigrosRoot, 'rev-parse', 'HEAD')
    }
    tests = [ordered]@{
        phigrosDebugUnitTest = -not $SkipTests
    }
    artifacts = @($manifestArtifacts)
}
$manifest | ConvertTo-Json -Depth 8 |
    Set-Content -LiteralPath (Join-Path $stagingDirectory 'build-manifest.json') -Encoding utf8

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
foreach ($file in Get-ChildItem -LiteralPath $stagingDirectory -File) {
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $outputDirectory $file.Name) -Force
}

Write-Host "`n全部构建完成，集中产物：$outputDirectory" -ForegroundColor Green
Get-ChildItem -LiteralPath $outputDirectory -File |
    Sort-Object Name |
    Select-Object Name, Length, LastWriteTime
