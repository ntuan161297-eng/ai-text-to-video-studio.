; =====================================================================
; Inno Setup Script - BẢN CẬP NHẬT NHANH (AI Studio Quick Update Patch)
; Dành cho máy ĐÃ CÀI ĐẶT C:\AI_Text_To_Video_Studio muốn nâng cấp nhanh
; =====================================================================

#define MyAppName "AI Studio Update Patch"
#define MyAppVersion "1.0.1"
#define MyAppPublisher "Tuan Na"
#define MyAppExeName "Khoi_Dong_Studio.bat"

[Setup]
AppId={{D37E6B20-569A-40F4-B1F8-29D5580C26E1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName=C:\AI_Text_To_Video_Studio
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=AI_Studio_Update_Patch
SetupIconFile=app_icon.ico
Compression=lzma2/normal
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
DisableDirPage=yes
CloseApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; 1. Script khoi dong moi nhat
Source: "..\Khoi_Dong_Studio.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\Tat_Studio.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\Cap_Nhat_Tu_Git.bat"; DestDir: "{app}"; Flags: ignoreversion

; 2. Toan bo ma nguon Backend da sua loi
Source: "..\src\*"; DestDir: "{app}\src"; Excludes: "*.map"; Flags: ignoreversion recursesubdirs createallsubdirs

; 3. Ban build Web moi nhat
Source: "..\web\.next\*"; DestDir: "{app}\web\.next"; Excludes: "cache\*"; Flags: ignoreversion recursesubdirs createallsubdirs

; 4. Ma nguon web src
Source: "..\web\src\*"; DestDir: "{app}\web\src"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Khởi động lại AI Studio ngay bây giờ"; Flags: postinstall shellexec skipifsilent nowait

[Code]
// Tu dong dung Studio neu dang chay truoc khi cap nhat (chay khi {app} da duoc khoi tao)
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
