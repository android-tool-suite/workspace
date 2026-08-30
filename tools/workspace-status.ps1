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
        return $null
    }
    $value = ($output -join "`n").Trim()
    if (-not $value) {
        return $null
    }
    return $value
}

function Get-ShortCommit([string]$Commit) {
    if (-not $Commit) {
        return '-'
    }
    return $Commit.Substring(0, [Math]::Min(7, $Commit.Length))
}

function Get-CommitRelation([string]$Repository, [string]$Base, [string]$Current) {
    if (-not $Base -or -not $Current) {
        return '未知'
    }
    if ($Base -eq $Current) {
        return '已锁定'
    }

    $counts = Invoke-GitOptional $Repository @(
        'rev-list',
        '--left-right',
        '--count',
        "$Base...$Current"
    )
    if (-not $counts) {
        return '无法比较'
    }

    $parts = @($counts -split '\s+')
    $behind = [int]$parts[0]
    $ahead = [int]$parts[1]
    if ($behind -eq 0 -and $ahead -gt 0) {
        return "超前 +$ahead"
    }
    if ($behind -gt 0 -and $ahead -eq 0) {
        return "落后 -$behind"
    }
    return "已分叉 -$behind/+$ahead"
}

function Get-PublishState([string]$Repository, [string]$Commit) {
    if (-not $Commit) {
        return '未知'
    }

    # This deliberately uses local remote-tracking refs and never performs a
    # network fetch. A successful push updates those refs in the normal case.
    $remoteRefs = Invoke-GitOptional $Repository @(
        'for-each-ref',
        '--format=%(refname:short)',
        "--contains=$Commit",
        'refs/remotes'
    )
    if ($remoteRefs) {
        $publishedRefs = @(
            $remoteRefs -split "`n" |
                Where-Object { $_ -and -not $_.EndsWith('/HEAD') }
        )
        if ($publishedRefs.Count -gt 0) {
            return '已发布'
        }
    }
    return '本地远端未包含'
}

function Read-Version([string]$BuildFile) {
    if ([string]::IsNullOrWhiteSpace($BuildFile) -or -not (Test-Path -LiteralPath $BuildFile)) {
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

$components = @(
    [pscustomobject]@{
        Name = 'app'
        RelativePath = 'app'
        Path = (Join-Path $workspaceRoot 'app')
        Build = (Join-Path $workspaceRoot 'app\app\build.gradle')
    },
    [pscustomobject]@{
        Name = 'plugin-registry'
        RelativePath = 'plugin-registry'
        Path = (Join-Path $workspaceRoot 'plugin-registry')
        Build = $null
    },
    [pscustomobject]@{
        Name = 'shizuku-auth'
        RelativePath = 'plugins/shizuku-auth'
        Path = (Join-Path $workspaceRoot 'plugins\shizuku-auth')
        Build = (Join-Path $workspaceRoot 'plugins\shizuku-auth\build.gradle')
    },
    [pscustomobject]@{
        Name = 'accessibility-grant'
        RelativePath = 'plugins/accessibility-grant'
        Path = (Join-Path $workspaceRoot 'plugins\accessibility-grant')
        Build = (Join-Path $workspaceRoot 'plugins\accessibility-grant\build.gradle')
    },
    [pscustomobject]@{
        Name = 'phigros-advisor'
        RelativePath = 'plugins/phigros-advisor'
        Path = (Join-Path $workspaceRoot 'plugins\phigros-advisor')
        Build = (Join-Path $workspaceRoot 'plugins\phigros-advisor\build.gradle')
    },
    [pscustomobject]@{
        Name = 'gacha-analysis'
        RelativePath = 'plugins/gacha-analysis'
        Path = (Join-Path $workspaceRoot 'plugins\gacha-analysis')
        Build = (Join-Path $workspaceRoot 'plugins\gacha-analysis\build.gradle')
    }
)

$workspaceStatus = Invoke-Git $workspaceRoot @(
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
    '--ignore-submodules=all'
)
$workspaceDirty = [bool]$workspaceStatus
$workspaceOrigin = Invoke-GitOptional $workspaceRoot @('remote', 'get-url', 'origin')
$workspaceRow = [pscustomobject]@{
    Repository = 'workspace'
    Branch = Invoke-Git $workspaceRoot @('branch', '--show-current')
    Commit = Get-ShortCommit (Invoke-Git $workspaceRoot @('rev-parse', 'HEAD'))
    SourceDirty = $workspaceDirty
    Origin = if ($workspaceOrigin) { $workspaceOrigin } else { '-' }
}

$sourceDirty = $workspaceDirty
$rows = foreach ($component in $components) {
    if (-not (Test-Path -LiteralPath (Join-Path $component.Path '.git'))) {
        throw "子模块未初始化：$($component.RelativePath)。请运行 git submodule update --init --recursive。"
    }

    $status = Invoke-Git $component.Path @(
        'status',
        '--porcelain=v1',
        '--untracked-files=all'
    )
    $componentDirty = [bool]$status
    if ($componentDirty) {
        $sourceDirty = $true
    }

    $head = Invoke-GitOptional $component.Path @('rev-parse', 'HEAD')
    $locked = Invoke-GitOptional $workspaceRoot @(
        'rev-parse',
        "HEAD:$($component.RelativePath)"
    )
    $indexed = Invoke-GitOptional $workspaceRoot @(
        'rev-parse',
        ":$($component.RelativePath)"
    )
    $gitlinkStaged = [bool]($indexed -and $locked -ne $indexed)
    $publishState = Get-PublishState $component.Path $head

    $baselineState = if ($componentDirty) {
        '不可更新：源码脏'
    }
    elseif ($publishState -ne '已发布') {
        '不可更新：未发布'
    }
    elseif ($head -eq $locked) {
        '已锁定'
    }
    elseif ($gitlinkStaged -and $indexed -eq $head) {
        '已暂存'
    }
    else {
        '可更新基线'
    }

    $origin = Invoke-GitOptional $component.Path @('remote', 'get-url', 'origin')
    [pscustomobject]@{
        Repository = $component.Name
        Branch = Invoke-Git $component.Path @('branch', '--show-current')
        Head = Get-ShortCommit $head
        Locked = Get-ShortCommit $locked
        LockState = Get-CommitRelation $component.Path $locked $head
        SourceDirty = $componentDirty
        GitlinkStaged = $gitlinkStaged
        PublishState = $publishState
        BaselineState = $baselineState
        Version = Read-Version $component.Build
        Changelog = Test-Path -LiteralPath (Join-Path $component.Path 'CHANGELOG.md')
        Origin = if ($origin) { $origin } else { '-' }
    }
}

Write-Host '外层集成工作区：' -ForegroundColor Cyan
$workspaceRow | Format-Table -AutoSize

Write-Host '组件状态（PublishState 基于本地 remote-tracking refs，不主动 fetch）：' -ForegroundColor Cyan
$rows |
    Select-Object Repository, Branch, Head, Locked, LockState, SourceDirty,
        GitlinkStaged, PublishState, BaselineState, Version, Changelog |
    Format-Table -AutoSize

Write-Host '组件远端：' -ForegroundColor Cyan
$rows |
    Select-Object Repository, Origin |
    Format-Table -AutoSize

$artifactDirectory = Join-Path $workspaceRoot 'artifacts'
if (Test-Path -LiteralPath $artifactDirectory) {
    Write-Host '集中产物：' -ForegroundColor Cyan
    Get-ChildItem -LiteralPath $artifactDirectory -File |
        Sort-Object Name |
        Select-Object Name, Length, LastWriteTime |
        Format-Table -AutoSize
}

if ($FailOnDirty -and $sourceDirty) {
    exit 2
}
