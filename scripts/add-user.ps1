# Создание пользователя разработчиком: скрытый ввод пароля.
# Пример:
#   .\scripts\add-user.ps1 -Login student -Name "Ученица"
#   .\scripts\add-user.ps1 -Login student -Name "Ученица" -Update
param(
    [Parameter(Mandatory = $true)][string]$Login,
    [string]$Name = '',
    [switch]$Update
)

$ErrorActionPreference = 'Stop'
$cmd = Get-Command php -ErrorAction SilentlyContinue
$php = if ($cmd) { $cmd.Source } else { "$env:LOCALAPPDATA\php-8.5.12\php.exe" }
if (-not (Test-Path -LiteralPath $php)) {
    throw 'PHP не найден. Укажите php.exe в PATH.'
}

$secure = Read-Host -AsSecureString "Пароль для $Login"
if ($null -eq $secure -or $secure.Length -eq 0) { throw 'Пустой пароль.' }
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    $env:BF_PASSWORD = $plain
    $phpArgs = @('scripts/add-user.php', $Login)
    if ($Name -ne '') { $phpArgs += "--name=$Name" }
    if ($Update) { $phpArgs += '--update' }
    & $php @phpArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Remove-Item Env:BF_PASSWORD -ErrorAction SilentlyContinue
    $plain = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
