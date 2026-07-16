[CmdletBinding()]
param(
    [switch]$FailOnDirty
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$workspaceRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))

function Invoke-Git([string]$Repository, [string[]]$Arguments) {
    $output = & git -c "safe.directory=$Repository" -C $Repository @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "git -C $Repository $($Arguments -join ' ') 执行失败"
    }
    return ($output -join "`n").Trim()
}

function Invoke-GitOptional([string]$Repository, [string[]]$Arguments) {
    $output = & git -c "safe.directory=$Repository" -C $Repository @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        return '-'
    }
    $value = ($output -join "`n").Trim()
    if (-not $value) {
        return '-'
    }
    return $value
}

function Read-Version([string]$BuildFile) {
    if (-not (Test-Path -LiteralPath $BuildFile)) {
        return '-'
    }
    $content = Get-Content -LiteralPath $BuildFile -Raw
    if ($content -match 'versionName\s+"([^"]+)"') {
        return $Matches[1]
    }
    if ($content -match 'pluginVersionName\s*=\s*"([^"]+)"') {
        return $Matches[1]
    }
    return '-'
}

$repositories = @(
    [pscustomobject]@{ Name = 'workspace'; Path = $workspaceRoot; Build = $null },
    [pscustomobject]@{ Name = 'app'; Path = (Join-Path $workspaceRoot 'app'); Build = (Join-Path $workspaceRoot 'app\app\build.gradle') },
    [pscustomobject]@{ Name = 'accessibility-grant'; Path = (Join-Path $workspaceRoot 'plugins\accessibility-grant'); Build = (Join-Path $workspaceRoot 'plugins\accessibility-grant\build.gradle') },
    [pscustomobject]@{ Name = 'phigros-advisor'; Path = (Join-Path $workspaceRoot 'plugins\phigros-advisor'); Build = (Join-Path $workspaceRoot 'plugins\phigros-advisor\build.gradle') },
    [pscustomobject]@{ Name = 'gacha-analysis'; Path = (Join-Path $workspaceRoot 'plugins\gacha-analysis'); Build = (Join-Path $workspaceRoot 'plugins\gacha-analysis\build.gradle') }
)

$dirty = $false
$rows = foreach ($repository in $repositories) {
    $status = Invoke-Git $repository.Path @('status', '--porcelain=v1')
    if ($status) {
        $dirty = $true
    }
    $origin = Invoke-GitOptional $repository.Path @('remote', 'get-url', 'origin')
    [pscustomobject]@{
        Repository = $repository.Name
        Branch = Invoke-Git $repository.Path @('branch', '--show-current')
        Commit = Invoke-GitOptional $repository.Path @('rev-parse', '--short', 'HEAD')
        Dirty = [bool]$status
        Version = if ($repository.Build) { Read-Version $repository.Build } else { '-' }
        Changelog = if ($repository.Name -eq 'workspace') { '-' } else { Test-Path -LiteralPath (Join-Path $repository.Path 'CHANGELOG.md') }
        HttpsOrigin = if ($origin -eq '-') { '-' } else { $origin.StartsWith('https://', [StringComparison]::OrdinalIgnoreCase) }
        Origin = $origin
    }
}

$rows | Format-Table -AutoSize

$artifactDirectory = Join-Path $workspaceRoot 'artifacts'
if (Test-Path -LiteralPath $artifactDirectory) {
    Write-Host "`n集中产物：" -ForegroundColor Cyan
    Get-ChildItem -LiteralPath $artifactDirectory -File |
        Sort-Object Name |
        Select-Object Name, Length, LastWriteTime |
        Format-Table -AutoSize
}

if ($FailOnDirty -and $dirty) {
    exit 2
}
