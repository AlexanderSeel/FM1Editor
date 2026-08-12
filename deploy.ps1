#!/usr/bin/env pwsh
# =============================================================================
# FM1 Editor — build on Windows and deploy to AlmaLinux over SSH/SCP
#
# Defaults to https://fm1editor.alai-x.com and /var/www/fm1editor.alai-x.com.
# The local Vite bundle is validated, archived, uploaded, and activated through
# deploy.sh so both deployment paths share Nginx, SSL, rollback, and health logic.
#
# Usage:
#   .\deploy.ps1 -VpsHost 203.0.113.10
#   .\deploy.ps1 -VpsHost 203.0.113.10 -IdentityFile $HOME\.ssh\id_ed25519
#   .\deploy.ps1 -VpsHost 203.0.113.10 -VpsUser deploy -UseSudo
#   .\deploy.ps1 -VpsHost 203.0.113.10 -Rollback
# =============================================================================

[CmdletBinding()]
param(
    [Alias('Host', 'Server')]
    [string]$VpsHost = $env:FM1EDITOR_VPS_HOST,

    [string]$VpsUser = 'root',
    [int]$SshPort = 22,
    [string]$IdentityFile = '',
    [switch]$PasswordAuth,
    [switch]$UseSudo,

    [string]$Domain = 'fm1editor.alai-x.com',
    [string]$RemoteBaseDir = '/var/www/fm1editor.alai-x.com',
    [int]$KeepReleases = 4,
    [switch]$NoSsl,
    [string]$RemoteSslCertificate = '',
    [string]$RemoteSslCertificateKey = '',

    [string]$LocalDistDir = 'dist',
    [switch]$CleanInstall,
    [switch]$SkipInstall,
    [switch]$SkipLint,
    [switch]$SkipBuild,
    [switch]$AllowSystemUpdate,
    [switch]$Rollback
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info([string]$Message) { Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success([string]$Message) { Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Warn([string]$Message) { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Stop-Deploy([string]$Message) { throw $Message }

function Test-Command([string]$Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        Stop-Deploy "Command failed with exit code $LASTEXITCODE`: $Command $($Arguments -join ' ')"
    }
}

function Invoke-NativeCapture {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )
    $output = & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        Stop-Deploy "Command failed with exit code $LASTEXITCODE`: $Command $($Arguments -join ' ')"
    }
    return ($output | Out-String).Trim()
}

function Assert-SafeShellValue([string]$Value, [string]$Name) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value.Contains("'")) {
        Stop-Deploy "$Name contains an unsupported value. Single quotes and empty values are not allowed."
    }
}

function Quote-Shell([string]$Value) {
    Assert-SafeShellValue $Value 'Remote argument'
    return "'$Value'"
}

function Assert-Prerequisites {
    if ([string]::IsNullOrWhiteSpace($VpsHost)) {
        Stop-Deploy 'Pass -VpsHost or set FM1EDITOR_VPS_HOST.'
    }
    if ($VpsHost -notmatch '^[A-Za-z0-9._:-]+$') {
        Stop-Deploy "Invalid VPS host: $VpsHost"
    }
    if ($Domain -notmatch '^[A-Za-z0-9.-]+$') {
        Stop-Deploy "Invalid domain: $Domain"
    }
    if ($KeepReleases -lt 1 -or $KeepReleases -gt 20) {
        Stop-Deploy '-KeepReleases must be between 1 and 20.'
    }
    if (($RemoteSslCertificate -and -not $RemoteSslCertificateKey) -or ($RemoteSslCertificateKey -and -not $RemoteSslCertificate)) {
        Stop-Deploy 'Pass both -RemoteSslCertificate and -RemoteSslCertificateKey.'
    }
    foreach ($value in @($VpsUser, $Domain, $RemoteBaseDir)) {
        Assert-SafeShellValue $value 'Deployment setting'
    }
    foreach ($command in @('ssh', 'scp')) {
        if (-not (Test-Command $command)) {
            Stop-Deploy "Required command '$command' was not found. Enable the Windows OpenSSH client."
        }
    }
    if (-not (Test-Path -LiteralPath 'deploy.sh' -PathType Leaf)) {
        Stop-Deploy 'deploy.sh was not found. Run deploy.ps1 from the repository root.'
    }
    if (-not $Rollback) {
        foreach ($command in @('npm', 'tar')) {
            if (-not (Test-Command $command)) {
                Stop-Deploy "Required command '$command' was not found."
            }
        }
    }
}

function Get-SshTarget { return "$VpsUser@$VpsHost" }

function Get-SshArguments {
    $arguments = @('-p', "$SshPort", '-o', 'StrictHostKeyChecking=accept-new')
    if ($IdentityFile) {
        $arguments += @('-i', $IdentityFile)
    }
    elseif ($PasswordAuth) {
        $arguments += @('-o', 'PreferredAuthentications=password', '-o', 'PubkeyAuthentication=no')
    }
    return $arguments
}

function Get-ScpArguments {
    $arguments = @('-P', "$SshPort", '-o', 'StrictHostKeyChecking=accept-new')
    if ($IdentityFile) {
        $arguments += @('-i', $IdentityFile)
    }
    elseif ($PasswordAuth) {
        $arguments += @('-o', 'PreferredAuthentications=password', '-o', 'PubkeyAuthentication=no')
    }
    return $arguments
}

function Get-PackageVersion([string]$PackageJsonPath) {
    if (-not (Test-Path -LiteralPath $PackageJsonPath -PathType Leaf)) { return $null }
    try {
        return (Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json).version
    }
    catch {
        Stop-Deploy "Could not read package version from $PackageJsonPath`: $($_.Exception.Message)"
    }
}

function Repair-WindowsNativePackages {
    $requirements = @(
        # Vite 8 uses Rolldown rather than Rollup. Keep these in sync with the
        # optionalDependencies of the installed build tools.
        @{ Path = 'node_modules/@rolldown/binding-win32-x64-msvc'; Package = '@rolldown/binding-win32-x64-msvc'; VersionFile = 'node_modules/rolldown/package.json' },
        @{ Path = 'node_modules/@tailwindcss/oxide-win32-x64-msvc'; Package = '@tailwindcss/oxide-win32-x64-msvc'; VersionFile = 'node_modules/@tailwindcss/oxide/package.json' }
    )

    $missing = @($requirements | Where-Object { -not (Test-Path -LiteralPath $_.Path -PathType Container) })
    if ($missing.Count -eq 0) {
        Write-Success 'Windows native npm packages are present.'
        return
    }

    Write-Warn 'npm omitted one or more Windows optional dependencies. Installing exact matching native packages without changing package-lock.json.'
    $installArguments = @('install', '--no-save', '--package-lock=false', '--no-audit', '--no-fund')
    foreach ($requirement in $missing) {
        $version = Get-PackageVersion $requirement.VersionFile
        if (-not $version) {
            Stop-Deploy "Cannot resolve the version for $($requirement.Package). Expected $($requirement.VersionFile)."
        }
        $installArguments += "$($requirement.Package)@$version"
    }
    Invoke-Native npm @installArguments

    $stillMissing = @($requirements | Where-Object { -not (Test-Path -LiteralPath $_.Path -PathType Container) })
    if ($stillMissing.Count -gt 0) {
        $missingNames = ($stillMissing | ForEach-Object { $_.Package }) -join ', '
        Stop-Deploy "Windows native dependencies are still missing: $missingNames"
    }
    Write-Success 'Windows native npm packages repaired.'
}

function Build-LocalApp {
    $lockBackup = $null
    $hadLock = Test-Path -LiteralPath 'package-lock.json' -PathType Leaf
    if ($hadLock) {
        $lockBackup = Join-Path ([System.IO.Path]::GetTempPath()) ("fm1editor-package-lock-{0}.json" -f [guid]::NewGuid().ToString('N'))
        Copy-Item -LiteralPath 'package-lock.json' -Destination $lockBackup -Force
    }

    try {
        if ($CleanInstall -and (Test-Path -LiteralPath 'node_modules' -PathType Container)) {
            Write-Info 'Removing node_modules for a clean local install...'
            Remove-Item -LiteralPath 'node_modules' -Recurse -Force
        }

        if (-not $SkipInstall) {
            Write-Info 'Installing npm dependencies with optional native packages...'
            Invoke-Native npm install --include=optional --no-audit --no-fund
            Repair-WindowsNativePackages
        }

        if (-not $SkipLint) {
            Write-Info 'Running TypeScript validation...'
            Invoke-Native npm run lint
        }

        if (-not $SkipBuild) {
            Write-Info 'Building production Vite bundle...'
            Invoke-Native npm run build
        }

        if (-not (Test-Path -LiteralPath (Join-Path $LocalDistDir 'index.html') -PathType Leaf)) {
            Stop-Deploy "Build output '$LocalDistDir/index.html' was not found."
        }
        Write-Success "Local bundle ready: $LocalDistDir"
    }
    finally {
        if ($hadLock -and $lockBackup -and (Test-Path -LiteralPath $lockBackup)) {
            Copy-Item -LiteralPath $lockBackup -Destination 'package-lock.json' -Force
            Remove-Item -LiteralPath $lockBackup -Force -ErrorAction SilentlyContinue
        }
    }
}

function Get-Revision {
    if (Test-Command 'git') {
        try {
            $revision = Invoke-NativeCapture git rev-parse HEAD
            if ($revision -match '^[0-9a-fA-F]{7,40}$') { return $revision }
        }
        catch {
            Write-Warn 'Could not determine the Git revision; using a timestamp.'
        }
    }
    return (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
}

function New-DistArchive {
    $resolvedDist = (Resolve-Path -LiteralPath $LocalDistDir).Path
    $archive = Join-Path ([System.IO.Path]::GetTempPath()) ("fm1editor-dist-{0}.tar.gz" -f [guid]::NewGuid().ToString('N'))
    Write-Info "Packaging $LocalDistDir..."
    # Pass tar flags as an array: otherwise PowerShell binds tar's -C option to
    # Invoke-Native's -Command parameter before the native command is invoked.
    Invoke-Native 'tar' @('-czf', $archive, '-C', $resolvedDist, '.')
    Write-Success 'Distribution archive created.'
    return $archive
}

function New-LfDeployScript {
    $temporaryScript = Join-Path ([System.IO.Path]::GetTempPath()) ("fm1editor-deploy-{0}.sh" -f [guid]::NewGuid().ToString('N'))
    $content = (Get-Content -LiteralPath 'deploy.sh' -Raw) -replace "`r`n?", "`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText($temporaryScript, $content, $utf8NoBom)
    return $temporaryScript
}

function Send-File([string]$LocalPath, [string]$RemotePath) {
    $target = Get-SshTarget
    $arguments = @(Get-ScpArguments) + @($LocalPath, "${target}:$RemotePath")
    Invoke-Native scp @arguments
}

function Invoke-RemoteDeployment([string]$RemoteScript, [string]$RemoteArchive, [string]$Revision) {
    $arguments = @(
        'bash', (Quote-Shell $RemoteScript),
        '--domain', (Quote-Shell $Domain),
        '--base-dir', (Quote-Shell $RemoteBaseDir),
        '--keep-releases', "$KeepReleases"
    )

    if (-not $AllowSystemUpdate) { $arguments += '--skip-system-update' }
    if ($NoSsl) { $arguments += '--no-ssl' }
    if ($RemoteSslCertificate) {
        $arguments += @('--certificate', (Quote-Shell $RemoteSslCertificate), '--certificate-key', (Quote-Shell $RemoteSslCertificateKey))
    }
    if ($Rollback) {
        $arguments += '--rollback'
    }
    else {
        $arguments += @('--artifact', (Quote-Shell $RemoteArchive), '--revision', (Quote-Shell $Revision))
    }

    $command = ($arguments -join ' ')
    if ($UseSudo -and $VpsUser -ne 'root') { $command = "sudo $command" }
    $cleanup = "status=`$?; rm -f $(Quote-Shell $RemoteScript)"
    if (-not $Rollback) { $cleanup += " $(Quote-Shell $RemoteArchive)" }
    $command = "$command; $cleanup; exit `$status"

    $sshArguments = @(Get-SshArguments) + @((Get-SshTarget), $command)
    Invoke-Native ssh @sshArguments
}

function Invoke-Deployment {
    Assert-Prerequisites
    $archive = $null
    $localDeployScript = $null
    $remoteToken = [guid]::NewGuid().ToString('N')
    $remoteScript = "/tmp/fm1editor-deploy-$remoteToken.sh"
    $remoteArchive = "/tmp/fm1editor-dist-$remoteToken.tar.gz"

    try {
        if (-not $Rollback) {
            Build-LocalApp
            $archive = New-DistArchive
        }
        $localDeployScript = New-LfDeployScript

        Write-Info "Uploading deployment workflow to $(Get-SshTarget)..."
        Send-File $localDeployScript $remoteScript
        if (-not $Rollback) { Send-File $archive $remoteArchive }
        Write-Success 'Upload complete.'

        $revision = if ($Rollback) { 'rollback' } else { Get-Revision }
        Write-Info "Activating revision $revision on $Domain..."
        Invoke-RemoteDeployment $remoteScript $remoteArchive $revision

        $protocol = if ($NoSsl) { 'http' } else { 'https' }
        Write-Host ''
        Write-Success 'FM1 Editor deployment complete.'
        Write-Host "  URL:      ${protocol}://${Domain}"
        Write-Host "  VPS:      $(Get-SshTarget)"
        Write-Host "  Root:     $RemoteBaseDir/current"
        Write-Host "  Revision: $revision"
    }
    finally {
        foreach ($path in @($archive, $localDeployScript)) {
            if ($path -and (Test-Path -LiteralPath $path)) {
                Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

try {
    Invoke-Deployment
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
