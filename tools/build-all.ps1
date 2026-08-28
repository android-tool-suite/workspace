[CmdletBinding()]
param(
    [switch]$NoClean,
    [switch]$SkipTests,
    [string]$GradleExecutable = 'gradle',
    [string]$PythonExecutable = 'python',
    [string]$ProviderSigningKey
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspaceRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$appRoot = Join-Path $workspaceRoot 'app'
$registryRoot = Join-Path $workspaceRoot 'plugin-registry'
$accessibilityRoot = Join-Path $workspaceRoot 'plugins\accessibility-grant'
$phigrosRoot = Join-Path $workspaceRoot 'plugins\phigros-advisor'
$gachaRoot = Join-Path $workspaceRoot 'plugins\gacha-analysis'
$shizukuProject = Join-Path $appRoot 'examples\runtime-v2\shizuku-auth'
$shizukuArtifact = Join-Path $appRoot 'artifacts\shizuku-auth.atsplugin'
$shizukuProviderModule = Join-Path $appRoot 'trusted-shizuku-provider'
$shizukuPackageProject = Join-Path $appRoot 'build\runtime-v2\shizuku-auth-package'
$providerPublicKey = Join-Path $registryRoot 'registry-public.pem'
$sdkRepository = Join-Path $appRoot 'plugin-sdk\build\repository'
$stagingDirectory = Join-Path $workspaceRoot 'temp\build-all-staging'
$outputDirectory = Join-Path $workspaceRoot 'artifacts'

function Assert-WorkspaceLayout {
    $required = @(
        (Join-Path $appRoot 'settings.gradle'),
        (Join-Path $registryRoot 'sources.json'),
        (Join-Path $registryRoot 'tests\test_build_registry.py'),
        (Join-Path $accessibilityRoot 'settings.gradle'),
        (Join-Path $phigrosRoot 'settings.gradle'),
        (Join-Path $gachaRoot 'settings.gradle'),
        (Join-Path $shizukuProject 'manifest.json'),
        (Join-Path $shizukuProviderModule 'build.gradle'),
        $providerPublicKey
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

function Assert-PluginPackage([string]$Path, [string]$PythonPath) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $names = @($archive.Entries | ForEach-Object { $_.FullName })
        if ('manifest.json' -notin $names) { throw "插件包缺少 manifest.json：$Path" }
        $manifestEntry = $archive.GetEntry('manifest.json')
        $reader = [IO.StreamReader]::new($manifestEntry.Open(), [Text.Encoding]::UTF8)
        try { $manifest = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
        $formatVersion = [int]$manifest.formatVersion
        if ($formatVersion -eq 3) {
            if ('META-INF/ats-integrity.json' -notin $names) {
                throw "format v3 插件包缺少完整性清单：$Path"
            }
        }
        elseif ($formatVersion -eq 2) {
            if ('plugin.apk' -notin $names) { throw "format v2 插件包缺少 plugin.apk：$Path" }
        }
        else {
            throw "插件包 formatVersion 不受支持：$formatVersion"
        }
    }
    finally {
        $archive.Dispose()
    }
    if ($formatVersion -eq 3) {
        Invoke-Native $PythonPath @(
            (Join-Path $appRoot 'tools\runtime-v2\ats.py'),
            'verify',
            $Path
        )
    }
}

Assert-WorkspaceLayout
$gradle = Get-Command $GradleExecutable -ErrorAction SilentlyContinue
if ($null -eq $gradle) {
    throw "找不到 Gradle：$GradleExecutable。请安装 Gradle 8.9+ 并加入 PATH。"
}
$python = Get-Command $PythonExecutable -ErrorAction SilentlyContinue
if ($null -eq $python) {
    throw "找不到 Python：$PythonExecutable。Runtime v2 产物验证需要 Python 3。"
}

$buildTasks = if ($NoClean) { @('collectArtifacts') } else { @('clean', 'collectArtifacts') }

if (-not $SkipTests) {
    Invoke-Native $python.Source @(
        '-m', 'unittest', 'discover',
        '-s', (Join-Path $registryRoot 'tests'),
        '-v'
    )
    Invoke-Native $python.Source @(
        '-m', 'unittest', 'discover',
        '-s', (Join-Path $appRoot 'tools\runtime-v2\tests'),
        '-v'
    )
    Invoke-Native $gradle.Source @(
        '-p', $appRoot,
        ':runtime-contract:testDebugUnitTest',
        ':app:testDebugUnitTest'
    )
}

if ([string]::IsNullOrWhiteSpace($ProviderSigningKey)) {
    $ProviderSigningKey = [Environment]::GetEnvironmentVariable('ATS_PROVIDER_SIGNING_KEY')
}
if ([string]::IsNullOrWhiteSpace($ProviderSigningKey)) {
    $localProperties = Join-Path $appRoot 'local.properties'
    if (Test-Path -LiteralPath $localProperties) {
        $keyLine = Get-Content -LiteralPath $localProperties |
            Where-Object { $_ -like 'atsProviderSigningKey=*' } |
            Select-Object -First 1
        if ($keyLine) { $ProviderSigningKey = $keyLine.Substring('atsProviderSigningKey='.Length).Trim() }
    }
}
if ([string]::IsNullOrWhiteSpace($ProviderSigningKey) -or -not (Test-Path -LiteralPath $ProviderSigningKey -PathType Leaf)) {
    throw '缺少受信 Provider publisher 私钥。请设置 ATS_PROVIDER_SIGNING_KEY 或 app/local.properties 的 atsProviderSigningKey。'
}
$ProviderSigningKey = [IO.Path]::GetFullPath($ProviderSigningKey)

Invoke-Native $gradle.Source (@('-p', $appRoot) + $buildTasks)
Invoke-Native $gradle.Source @('-p', $appRoot, ':trusted-shizuku-provider:assembleDebug')

Reset-SafeDirectory $shizukuPackageProject
Copy-Item -LiteralPath (Join-Path $shizukuProject 'manifest.json') `
    -Destination (Join-Path $shizukuPackageProject 'manifest.json')
foreach ($payloadDirectory in @('ui', 'web', 'workers')) {
    $source = Join-Path $shizukuProject $payloadDirectory
    if (Test-Path -LiteralPath $source -PathType Container) {
        Copy-Item -LiteralPath $source -Destination (Join-Path $shizukuPackageProject $payloadDirectory) -Recurse
    }
}
$providerAndroidDirectory = Join-Path $shizukuPackageProject 'android'
New-Item -ItemType Directory -Path $providerAndroidDirectory -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $shizukuProviderModule 'build\outputs\apk\debug\trusted-shizuku-provider-debug.apk') `
    -Destination (Join-Path $providerAndroidDirectory 'provider.apk')
Invoke-Native $python.Source @(
    (Join-Path $appRoot 'tools\runtime-v2\ats.py'),
    'pack',
    $shizukuPackageProject,
    '--output', $shizukuArtifact,
    '--signing-key', $ProviderSigningKey,
    '--public-key', $providerPublicKey
)
Invoke-Native $python.Source @(
    (Join-Path $appRoot 'tools\runtime-v2\ats.py'),
    'verify',
    $shizukuArtifact,
    '--public-key', $providerPublicKey,
    '--require-signature'
)
Invoke-Native $gradle.Source @(
    '-p', $appRoot,
    ':plugin-sdk:publishReleasePublicationToPluginSdkRepository'
)

$sdkProperty = "-PatsSdkRepository=$sdkRepository"
Invoke-Native $gradle.Source (@('-p', $accessibilityRoot, $sdkProperty) + $buildTasks)
if (-not $SkipTests) {
    Invoke-Native $gradle.Source @('-p', $accessibilityRoot, $sdkProperty, 'testDebugUnitTest')
}
if (-not $SkipTests) {
    Invoke-Native $gradle.Source @('-p', $phigrosRoot, $sdkProperty, 'testDebugUnitTest')
}
Invoke-Native $gradle.Source (@('-p', $phigrosRoot, $sdkProperty) + $buildTasks)
if (-not $SkipTests) {
    Invoke-Native $gradle.Source @('-p', $gachaRoot, $sdkProperty, 'testDebugUnitTest')
}
Invoke-Native $gradle.Source (@('-p', $gachaRoot, $sdkProperty) + $buildTasks)
$artifacts = @(
    [pscustomobject]@{
        Name = 'android-tool-suite-debug.apk'
        Source = Join-Path $appRoot 'artifacts\android-tool-suite-debug.apk'
    },
    [pscustomobject]@{
        Name = 'shizuku-auth.atsplugin'
        Source = $shizukuArtifact
    },
    [pscustomobject]@{
        Name = 'accessibility-grant.atsplugin'
        Source = Join-Path $accessibilityRoot 'artifacts\accessibility-grant.atsplugin'
    },
    [pscustomobject]@{
        Name = 'phigros-advisor.atsplugin'
        Source = Join-Path $phigrosRoot 'artifacts\phigros-advisor.atsplugin'
    },
    [pscustomobject]@{
        Name = 'gacha-analysis.atsplugin'
        Source = Join-Path $gachaRoot 'artifacts\gacha-analysis.atsplugin'
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
        Assert-PluginPackage $destination $python.Source
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
        gachaAnalysis = Get-NativeOutput 'git' @('-c', "safe.directory=$gachaRoot", '-C', $gachaRoot, 'rev-parse', 'HEAD')
        pluginRegistry = Get-NativeOutput 'git' @('-c', "safe.directory=$registryRoot", '-C', $registryRoot, 'rev-parse', 'HEAD')
    }
    tests = [ordered]@{
        phigrosDebugUnitTest = -not $SkipTests
        gachaDebugUnitTest = -not $SkipTests
        registryGeneratorUnitTest = -not $SkipTests
        runtimeV2CliUnitTest = -not $SkipTests
        runtimeContractUnitTest = -not $SkipTests
        hostDebugUnitTest = -not $SkipTests
        accessibilityDebugUnitTest = -not $SkipTests
        shizukuTrustedPluginPackage = $true
    }
    artifacts = @($manifestArtifacts)
}
$manifest | ConvertTo-Json -Depth 8 |
    Set-Content -LiteralPath (Join-Path $stagingDirectory 'build-manifest.json') -Encoding utf8

# Staging is complete at this point, so replacing the centralized directory cannot expose
# a partial build. Reset it to prevent retired artifacts from surviving a successful refresh.
Reset-SafeDirectory $outputDirectory
foreach ($file in Get-ChildItem -LiteralPath $stagingDirectory -File) {
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $outputDirectory $file.Name) -Force
}

Write-Host "`n全部构建完成，集中产物：$outputDirectory" -ForegroundColor Green
Get-ChildItem -LiteralPath $outputDirectory -File |
    Sort-Object Name |
    Select-Object Name, Length, LastWriteTime
