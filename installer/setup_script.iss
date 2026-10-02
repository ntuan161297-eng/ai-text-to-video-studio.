; =====================================================================
; Inno Setup Script - AI Text-to-Video Studio (Standalone Windows Edition)
; Phien ban: 1.0.0
; =====================================================================

#define MyAppName "AI Text-to-Video Studio"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Tuan Na"
#define MyAppExeName "Khoi_Dong_Studio.bat"

[Setup]
AppId={{D37E6B20-569A-40F4-B1F8-29D5580C26E1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName=C:\AI_Text_To_Video_Studio
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=AI_Studio_Setup_v1.0
SetupIconFile=app_icon.ico
Compression=lzma2/normal
LZMAUseSeparateProcess=yes
LZMADictionarySize=16384
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
DisableDirPage=no
CloseApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Tạo biểu tượng trên màn hình Desktop"; GroupDescription: "Biểu tượng:"; Flags: checkablealone

[Files]
; 1. Script khoi dong va tat studio
Source: "..\Khoi_Dong_Studio.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\Tat_Studio.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\Cap_Nhat_Tu_Git.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "app_icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion

; 2. Cau hinh moi truong sach (.env.example mac dinh)
Source: "..\.env.example"; DestDir: "{app}"; Flags: ignoreversion

; 3. Ma nguon Backend
Source: "..\src\*"; DestDir: "{app}\src"; Excludes: "*.map"; Flags: ignoreversion recursesubdirs createallsubdirs

; 4. TTS runner script
Source: "..\scripts\tts_runner.py"; DestDir: "{app}\scripts"; Flags: ignoreversion

; 5. Giao dien Web (bo qua cache, trace, source maps de nhe hon va khoi dong nhanh)
Source: "..\web\*"; DestDir: "{app}\web"; Excludes: ".next\cache\*,.next\trace*,.next\trace,*.log,*.map,*.ts.map,*.js.map,node_modules\.cache\*"; Flags: ignoreversion recursesubdirs createallsubdirs

; 6. Thu vien dependencies
Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Excludes: ".cache\*,*.map,*.ts.map,*.js.map,.remotion\chrome-headless-shell\win64\chrome-headless-shell-win64\locales\*,*.md,*.markdown"; Flags: ignoreversion recursesubdirs createallsubdirs

; 7. Node.js Portable Runtime
Source: "runtime\*"; DestDir: "{app}\runtime"; Excludes: "*.map,*.md,docs\*,test\*"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
; Cac thu muc du lieu va video xuat
Name: "{app}\data"; Permissions: users-full
Name: "{app}\output"; Permissions: users-full
Name: "{app}\temp"; Permissions: users-full
Name: "{app}\review"; Permissions: users-full

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: desktopicon
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"
Name: "{group}\Dừng Studio (Tat Studio)"; Filename: "{app}\Tat_Studio.bat"
Name: "{group}\Thư mục Video Xuất"; Filename: "{app}\output"
Name: "{group}\Gỡ cài đặt AI Studio"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Khởi động AI Text-to-Video Studio ngay bây giờ"; Flags: postinstall shellexec skipifsilent nowait

[UninstallDelete]
Type: filesandordirs; Name: "{app}\temp"

[Code]
// Tu dong dung Studio neu dang chay truoc khi cai de tranh xung dot file (chay khi {app} da duoc khoi tao)
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  if FileExists(ExpandConstant('{app}\Tat_Studio.bat')) then
  begin
    Exec(ExpandConstant('{app}\Tat_Studio.bat'), '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
  Result := '';
end;

// Tu dong dung Studio truoc khi go cai dat
function InitializeUninstall(): Boolean;
var
  ResultCode: Integer;
begin
  if FileExists(ExpandConstant('{app}\Tat_Studio.bat')) then
  begin
    Exec(ExpandConstant('{app}\Tat_Studio.bat'), '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
  Result := True;
end;
