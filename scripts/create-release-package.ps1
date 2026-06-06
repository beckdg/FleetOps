#Release packaging script for FleetOps (Windows / PowerShell).
#Creates a source release ZIP with full git history, excluding regenerable artifacts.

param(
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [string]$OutputDir = "release"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step($Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

$RepoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $RepoRoot

Write-Step "Checking git working tree is clean"
$Status = git status --porcelain
if ($Status) {
    Write-Host $Status
    throw "Git working tree is not clean. Commit or stash changes before packaging."
}

$Version = (git describe --tags --always 2>$null)
if (-not $Version) { $Version = (git rev-parse --short HEAD).Trim() }
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$PackageBaseName = "fleetops-release-$Version-$Timestamp"
$StagingDir = Join-Path $env:TEMP "fleetops-release-staging-$Timestamp"
$ReleaseDir = Join-Path $RepoRoot $OutputDir
$ZipPath = Join-Path $ReleaseDir "$PackageBaseName.zip"
$ChecksumPath = "$ZipPath.sha256"

if (-not $SkipBuild) {
    Write-Step "Running monorepo build"
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw "pnpm build failed with exit code $LASTEXITCODE" }
}

if (-not $SkipTests) {
    Write-Step "Running unit tests"
    pnpm test
    if ($LASTEXITCODE -ne 0) { throw "pnpm test failed with exit code $LASTEXITCODE" }
}

Write-Step "Preparing staging directory"
if (Test-Path $StagingDir) { Remove-Item -Recurse -Force $StagingDir }
New-Item -ItemType Directory -Path $StagingDir | Out-Null
New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null

$ExcludeDirs = @(
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".turbo",
    ".cache",
    "release",
    ".husky\_"
)

Write-Step "Copying repository files (excluding regenerable artifacts)"
robocopy $RepoRoot $StagingDir /MIR /NFL /NDL /NJH /NJS /NC /NS /NP `
    /XD node_modules dist build coverage .turbo .cache release .git `
    | Out-Null

if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

Write-Step "Including .git directory"
robocopy (Join-Path $RepoRoot ".git") (Join-Path $StagingDir ".git") /MIR /NFL /NDL /NJH /NJS /NC /NS /NP `
    | Out-Null

if ($LASTEXITCODE -ge 8) { throw "robocopy (.git) failed with exit code $LASTEXITCODE" }

Write-Step "Creating ZIP archive"
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
Compress-Archive -Path (Join-Path $StagingDir "*") -DestinationPath $ZipPath -CompressionLevel Optimal

Write-Step "Generating SHA256 checksum"
$Hash = (Get-FileHash -Path $ZipPath -Algorithm SHA256).Hash.ToLower()
"$Hash  $(Split-Path $ZipPath -Leaf)" | Set-Content -Path $ChecksumPath -NoNewline

Write-Step "Cleaning staging directory"
Remove-Item -Recurse -Force $StagingDir

Write-Host ""
Write-Host "Release package created:" -ForegroundColor Green
Write-Host "  ZIP:       $ZipPath"
Write-Host "  Checksum:  $ChecksumPath"
Write-Host "  SHA256:    $Hash"
