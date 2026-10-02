; Inno Setup Script cho AI Text-to-Video Studio
; Phien ban 1.0.0

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
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableDirPage=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Tao bieu tuong tren man hinh Desktop"; GroupDescription: "Bieu tuong:"; Flags: checkablealone

[Files]
; File khoi dong va tat studio
Source: "..\Khoi_Dong_Studio.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\Tat_Studio.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "app_icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.env.example"; DestDir: "{app}"; Flags: ignoreversion

; Ma nguon backend va script
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs

; Giao dien Web (bo qua thu muc cache va trace de tranh bi lock boi dev server)
Source: "..\web\*"; DestDir: "{app}\web"; Excludes: ".next\cache\*,.next\trace*,.next\trace,*.log"; Flags: ignoreversion recursesubdirs createallsubdirs

; Thu vien dependencies
Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; Node.js Portable Runtime
Source: "runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{app}\output"; Permissions: users-full
Name: "{app}\temp"; Permissions: users-full

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: desktopicon
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"
Name: "{group}\Dung Studio (Tat Studio)"; Filename: "{app}\Tat_Studio.bat"
Name: "{group}\Thu muc Video Xuat"; Filename: "{app}\output"
Name: "{group}\Go cai dat AI Studio"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Khoi dong AI Text-to-Video Studio ngay bay gio"; Flags: postinstall shellexec skipifsilent nowait
