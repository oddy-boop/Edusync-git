<#
run_storage_sql.ps1

Usage: Open PowerShell, navigate to this repo, then run:
  powershell -ExecutionPolicy Bypass -File .\run_storage_sql.ps1

What it does:
- Checks for `psql` command
- Prompts for your Supabase project ref (the <project_ref> part)
- Prompts securely for the Service Role Key
- Sets PGPASSWORD in the session and runs `psql -h <project_ref>.supabase.co -U postgres -d postgres -f .\storage.sql`
- Clears the in-memory secret afterwards

WARNING: Do not paste the service role key into shared terminals or logs. This script keeps the key only in memory for the run and then clears it.
#>

Write-Host "Run storage.sql against Supabase using Service Role Key (owner)"

# Check psql
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "Error: 'psql' not found in PATH. Install PostgreSQL client or add psql to PATH." -ForegroundColor Red
    Write-Host "On Windows you can install it via the PostgreSQL installer or use WSL. Example (Chocolatey): choco install postgresql" -ForegroundColor Yellow
    exit 1
}

# Prompt for project ref and secure key
$projectRef = Read-Host "Enter your Supabase project ref (the part before .supabase.co)"
if ([string]::IsNullOrWhiteSpace($projectRef)) { Write-Host "Project ref is required" -ForegroundColor Red; exit 1 }

$secureKey = Read-Host -AsSecureString "Paste your Service Role Key (input is hidden)"
if (-not $secureKey) { Write-Host "Service Role Key is required" -ForegroundColor Red; exit 1 }

# Convert secure string to plain securely for the duration of the command
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) | Out-Null
}

# Prepare host and path
$host = "${projectRef}.supabase.co"
$sqlFile = Join-Path (Get-Location) 'storage.sql'
if (-not (Test-Path $sqlFile)) { Write-Host "Could not find $sqlFile. Make sure storage.sql is in the current directory." -ForegroundColor Red; exit 1 }

# Export password for psql
$env:PGPASSWORD = $plainKey

# Run the SQL
Write-Host "Running $sqlFile against postgres@$host:5432..." -ForegroundColor Cyan
& psql -h $host -p 5432 -U postgres -d postgres -f $sqlFile
$exitCode = $LASTEXITCODE

# Clear secret from memory and environment
$plainKey = $null
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

if ($exitCode -eq 0) {
    Write-Host "Success: storage.sql executed." -ForegroundColor Green
} else {
    Write-Host "psql exited with code $exitCode. Check the output above for errors." -ForegroundColor Red
}

Write-Host "Done. Remember to rotate the Service Role Key if it was exposed." -ForegroundColor Yellow
