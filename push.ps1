$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

function Stop-WithMessage {
  param([string]$Message)

  Write-Host ""
  Write-Host $Message -ForegroundColor Red
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "Git is not installed or is not available in PATH."
}

if (-not (Test-Path -LiteralPath ".git")) {
  Stop-WithMessage "This folder is not a Git repository yet. Run git init and connect a GitHub remote first."
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
  Stop-WithMessage "No Git remote named origin was found. Add your GitHub remote first."
}

$branch = git branch --show-current
if (-not $branch) {
  Stop-WithMessage "Could not detect the current Git branch."
}

$status = git status --porcelain

if ($status) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $message = if ($args.Count -gt 0) { $args -join " " } else { "Update travel globe - $timestamp" }

  Write-Host "Adding changed files..." -ForegroundColor Cyan
  git add .

  Write-Host "Creating commit: $message" -ForegroundColor Cyan
  git commit -m $message
} else {
  Write-Host "No local changes to commit. Pushing current branch..." -ForegroundColor Yellow
}

Write-Host "Pushing to origin/$branch..." -ForegroundColor Cyan
git push origin $branch

Write-Host ""
Write-Host "Push complete." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"
