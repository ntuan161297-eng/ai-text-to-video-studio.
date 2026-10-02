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
Compression=lzma2/normal
LZMAUseSeparateProcess=yes
LZMADictionarySize=16384
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
; 1. File khoi dong va tat studio
Source: "..\Khoi_Dong_Studio.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\Tat_Studio.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "app_icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion

; 2. Cau hinh moi truong sach (CHỈ dùng .env.example, TUYỆT ĐỐI KHÔNG mang .env hoac data cua may local)
Source: "..\.env.example"; DestDir: "{app}"; Flags: ignoreversion

; 3. Ma nguon backend
Source: "..\src\*"; DestDir: "{app}\src"; Excludes: "*.map"; Flags: ignoreversion recursesubdirs createallsubdirs

; 4. Chi copy script TTS runtime (Khong copy file test/diagnose/benchmark de bao mat va giam dung luong)
Source: "..\scripts\tts_runner.py"; DestDir: "{app}\scripts"; Flags: ignoreversion

; 5. Giao dien Web (bo qua cache, trace, source maps de nhe hon va khoi dong nhanh)
Source: "..\web\*"; DestDir: "{app}\web"; Excludes: ".next\cache\*,.next\trace*,.next\trace,*.log,*.map,*.ts.map,*.js.map,node_modules\.cache\*"; Flags: ignoreversion recursesubdirs createallsubdirs

; 6. Thu vien dependencies (loai bo sourcemap, cache remotion va cac goi ngon ngu chromium khong dung)
Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Excludes: ".cache\*,*.map,*.ts.map,*.js.map,.remotion\chrome-headless-shell\win64\chrome-headless-shell-win64\locales\*,*.md,*.markdown"; Flags: ignoreversion recursesubdirs createallsubdirs

; 7. Node.js Portable Runtime (loai bo docs/map thua)
Source: "runtime\*"; DestDir: "{app}\runtime"; Excludes: "*.map,*.md,docs\*,test\*"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
; Tao cac thu muc trong san cho may moi (Khong co bat ky video hay du lieu nao tu may cu)
Name: "{app}\data"; Permissions: users-full
Name: "{app}\output"; Permissions: users-full
Name: "{app}\temp"; Permissions: users-full
Name: "{app}\review"; Permissions: users-full

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: desktopicon
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"
Name: "{group}\Dung Studio (Tat Studio)"; Filename: "{app}\Tat_Studio.bat"
Name: "{group}\Thu muc Video Xuat"; Filename: "{app}\output"
Name: "{group}\Go cai dat AI Studio"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Khoi dong AI Text-to-Video Studio ngay bay gio"; Flags: postinstall shellexec skipifsilent nowait
