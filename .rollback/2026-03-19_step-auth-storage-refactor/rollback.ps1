$backupRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $backupRoot '..\..')

$files = @(
  'App.tsx',
  'components\ItemForm.tsx',
  'components\PinPadModal.tsx',
  'services\supabaseClient.ts',
  'services\supabaseService.ts',
  'services\dataService.ts',
  'services\securityService.ts',
  'src\context\StateContext.tsx',
  'supabase_schema.sql',
  'types.ts',
  'TASK_CHECKLIST.txt',
  'UPDATE_LOG.txt',
  'senior_developer_tips.txt'
)

foreach ($file in $files) {
  $source = Join-Path $backupRoot $file
  $destination = Join-Path $projectRoot $file

  if (Test-Path $source) {
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
    Copy-Item $source $destination -Force
  }
}

$filesToRemove = @(
  'services\imageStorageService.ts',
  'src\hooks\useItemActions.ts',
  'src\hooks\useFilteredItems.ts'
)

foreach ($file in $filesToRemove) {
  $target = Join-Path $projectRoot $file
  if (Test-Path $target) {
    Remove-Item $target -Force
  }
}

Write-Host '롤백이 완료되었습니다.'
