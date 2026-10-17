[CmdletBinding()]
param(
    [string]$KeystorePath = (Join-Path $PSScriptRoot 'upload-keystore.jks'),
    [string]$KeyAlias = 'stride-upload'
)

$ErrorActionPreference = 'Stop'

function Read-ConfirmedSecret {
    param([Parameter(Mandatory)][string]$Prompt)

    while ($true) {
        $first = Read-Host $Prompt -AsSecureString
        $second = Read-Host 'Confirm password' -AsSecureString
        $firstPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($first)
        $secondPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($second)
        try {
            $firstText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstPtr)
            $secondText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondPtr)
            if ($firstText.Length -lt 6) {
                Write-Warning 'The password must contain at least 6 characters.'
                continue
            }
            if ($firstText -cne $secondText) {
                Write-Warning 'The passwords did not match. Try again.'
                continue
            }
            return $firstText
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstPtr)
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondPtr)
        }
    }
}

$resolvedKeystorePath = [IO.Path]::GetFullPath($KeystorePath)
$keystoreDirectory = Split-Path -Parent $resolvedKeystorePath
if (-not (Test-Path -LiteralPath $keystoreDirectory)) {
    New-Item -ItemType Directory -Path $keystoreDirectory | Out-Null
}

$storePassword = Read-ConfirmedSecret 'Upload keystore password'
$keyPassword = Read-ConfirmedSecret 'Upload key password (it may match the keystore password)'

try {
    $env:GRADLE_USER_HOME = Join-Path $PSScriptRoot '.gradle-user-home'
    $env:STRIDE_UPLOAD_KEYSTORE = $resolvedKeystorePath
    $env:STRIDE_UPLOAD_STORE_PASSWORD = $storePassword
    $env:STRIDE_UPLOAD_KEY_ALIAS = $KeyAlias
    $env:STRIDE_UPLOAD_KEY_PASSWORD = $keyPassword

    if (-not (Test-Path -LiteralPath $resolvedKeystorePath)) {
        Write-Host "Creating upload keystore at $resolvedKeystorePath"
        & keytool `
            -genkeypair `
            -keystore $resolvedKeystorePath `
            -storetype JKS `
            -storepass:env STRIDE_UPLOAD_STORE_PASSWORD `
            -alias $KeyAlias `
            -keypass:env STRIDE_UPLOAD_KEY_PASSWORD `
            -keyalg RSA `
            -keysize 2048 `
            -validity 10000 `
            -dname 'CN=Stride Fitness Upload, OU=Mobile, O=Stride Fitness, C=US'
        if ($LASTEXITCODE -ne 0) { throw 'keytool failed to create the upload keystore.' }
    }
    else {
        Write-Host "Using existing upload keystore at $resolvedKeystorePath"
    }

    Push-Location $PSScriptRoot
    try {
        & .\gradlew.bat --no-daemon clean bundleRelease assembleRelease
        if ($LASTEXITCODE -ne 0) { throw 'The Android release build failed.' }
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item Env:STRIDE_UPLOAD_KEYSTORE -ErrorAction SilentlyContinue
    Remove-Item Env:STRIDE_UPLOAD_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:STRIDE_UPLOAD_KEY_ALIAS -ErrorAction SilentlyContinue
    Remove-Item Env:STRIDE_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:GRADLE_USER_HOME -ErrorAction SilentlyContinue
    $storePassword = $null
    $keyPassword = $null
}

Write-Host 'Signed release bundle and APK created successfully.'
