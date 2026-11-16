<#
.SYNOPSIS
    Refuses a production Lucid package built from anything but the Lucid repo's origin/main, clean.

.DESCRIPTION
    build-bundle.ps1 checks that the monorepo is at origin/release/prd, which stamps the package with
    that release's Quodsi version. The API turns capabilities on for Lucid by that version (for example
    run_trace from 2026.11.16.2), so a package built from a Lucid checkout without the matching extension
    code would be told it can do things it can't: Include trace would show and runs would silently carry
    no trace (monorepo spec 2026-11-16-lucid-trace-design, final review). Building only from the Lucid
    repo's origin/main, with no uncommitted changes to tracked files, keeps the two repos in step.

.PARAMETER LucidRepo
    The Lucid repo's root folder (quodsi_lucidchart_package).
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$LucidRepo
)

git -C $LucidRepo fetch --quiet origin main
if ($LASTEXITCODE -ne 0) {
    Write-Error "Could not fetch origin/main in the Lucid repo ($LucidRepo)."
    exit 1
}
$Dirty = git -C $LucidRepo status --porcelain --untracked-files=no
if ($Dirty) {
    Write-Error "Production Lucid packages are built from a clean Lucid repo, but $LucidRepo has uncommitted changes to tracked files:`n$($Dirty -join "`n")`nCommit or discard them and re-run."
    exit 1
}
$Head = (git -C $LucidRepo rev-parse HEAD).Trim()
$Main = (git -C $LucidRepo rev-parse origin/main).Trim()
if ($Head -ne $Main) {
    $Branch = (git -C $LucidRepo rev-parse --abbrev-ref HEAD).Trim()
    Write-Error "Production Lucid packages are built from the Lucid repo's origin/main, but $LucidRepo is at $Branch ($($Head.Substring(0, 8))), not origin/main ($($Main.Substring(0, 8))). Merge and push to main, check out origin/main, and re-run."
    exit 1
}
Write-Host "[OK] Lucid repo at origin/main ($($Head.Substring(0, 8))), clean." -ForegroundColor Green
exit 0
