; Inno Setup Script for NeuralScaler 4K (DLSS 5)
; Generates standalone single-file installer: NeuralScaler-4K-Setup-v{#MyAppVersion}.exe

#define MyAppName "NeuralScaler 4K"
#ifndef MyAppVersion
#define MyAppVersion "2.2.0"
#endif
#define MyAppPublisher "justForever17"
#define MyAppURL "https://github.com/justForever17/NeuralScaler-4K"
#define MyAppExeName "NeuralScaler.bat"

[Setup]
AppId={{D37F2C5A-8E14-469F-A29B-9832B66C5E09}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\NeuralScaler-4K
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputBaseFilename=NeuralScaler-4K-Setup-v{#MyAppVersion}
OutputDir=..\release
SetupIconFile=..\public\app.ico
UninstallDisplayIcon={app}\app.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "chinesesimp"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "contextmenu"; Description: "添加到 Windows 资源管理器右键菜单 (支持 .mp4 / .mov / .mkv 快速超分)"; GroupDescription: "系统集成:"

[Files]
Source: "..\release\NeuralScaler-4K-Portable\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\public\app.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"; Tasks: desktopicon

[Registry]
; Windows Explorer Context Menu integration for .mp4, .mov, .mkv (Silent windowless dispatch)
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mp4\shell\NeuralScaler4K"; ValueType: string; ValueName: ""; ValueData: "使用 NeuralScaler 4K 进行超分"; Flags: uninsdeletekey; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mp4\shell\NeuralScaler4K"; ValueType: string; ValueName: "Icon"; ValueData: """{app}\app.ico"""; Flags: uninsdeletekey; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mp4\shell\NeuralScaler4K\command"; ValueType: string; ValueName: ""; ValueData: """{sys}\wscript.exe"" //B //Nologo ""{app}\launch_menu.vbs"" ""%1"""; Flags: uninsdeletekey; Tasks: contextmenu

Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mov\shell\NeuralScaler4K"; ValueType: string; ValueName: ""; ValueData: "使用 NeuralScaler 4K 进行超分"; Flags: uninsdeletekey; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mov\shell\NeuralScaler4K"; ValueType: string; ValueName: "Icon"; ValueData: """{app}\app.ico"""; Flags: uninsdeletekey; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mov\shell\NeuralScaler4K\command"; ValueType: string; ValueName: ""; ValueData: """{sys}\wscript.exe"" //B //Nologo ""{app}\launch_menu.vbs"" ""%1"""; Flags: uninsdeletekey; Tasks: contextmenu

Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mkv\shell\NeuralScaler4K"; ValueType: string; ValueName: ""; ValueData: "使用 NeuralScaler 4K 进行超分"; Flags: uninsdeletekey; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mkv\shell\NeuralScaler4K"; ValueType: string; ValueName: "Icon"; ValueData: """{app}\app.ico"""; Flags: uninsdeletekey; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mkv\shell\NeuralScaler4K\command"; ValueType: string; ValueName: ""; ValueData: """{sys}\wscript.exe"" //B //Nologo ""{app}\launch_menu.vbs"" ""%1"""; Flags: uninsdeletekey; Tasks: contextmenu

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "立即运行 {#MyAppName}"; Flags: nowait postinstall skipifsilent
