// Shared by app/build.rs and setup/build.rs (included with include!): the version from the project's VERSION file (its
// first line the name, its second the code), and the Windows resources every program carries: its icon, its version
// line in Properties (which the in-app updater of every earlier copy reads), and a manifest for sharp text on every screen.
#[allow(dead_code)]
fn adhkar_build(title: &str, description: &str) {
    use std::path::PathBuf;
    let here = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let root = here.join("..").join("..");
    let vt = std::fs::read_to_string(root.join("VERSION")).unwrap_or_default();
    let mut lines = vt.lines().map(str::trim).filter(|l| !l.is_empty());
    let name = lines.next().unwrap_or("1.0").to_string();
    let code = lines.next().unwrap_or("1").to_string();
    let mut parts: Vec<String> = name.split('.').map(String::from).collect();
    while parts.len() < 3 { parts.push("0".into()); }
    let quad = format!("{},{},{},{}", parts[0], parts[1], parts[2], code);
    let dotted = format!("{}.{}.{}.{}", parts[0], parts[1], parts[2], code);
    println!("cargo:rustc-env=ADHKAR_VERSION={}", name);
    println!("cargo:rustc-env=ADHKAR_CODE={}", code);
    println!("cargo:rerun-if-changed={}", root.join("VERSION").display());
    println!("cargo:rerun-if-env-changed=ADHKAR_ICON");

    let out = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let ico = std::env::var("ADHKAR_ICON").map(PathBuf::from).unwrap_or_else(|_| root.join("build").join("windows").join("adhkar.ico"));
    let manifest = out.join("app.manifest");
    std::fs::write(&manifest, r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity version="1.0.0.0" name="Adhkar" type="win32"/>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3"><security><requestedPrivileges><requestedExecutionLevel level="asInvoker" uiAccess="false"/></requestedPrivileges></security></trustInfo>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1"><application><supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/></application></compatibility>
  <application xmlns="urn:schemas-microsoft-com:asm.v3"><windowsSettings>
    <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
    <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2</dpiAwareness>
    <activeCodePage xmlns="http://schemas.microsoft.com/SMI/2019/WindowsSettings">UTF-8</activeCodePage>
  </windowsSettings></application>
  <dependency><dependentAssembly><assemblyIdentity type="win32" name="Microsoft.Windows.Common-Controls" version="6.0.0.0" processorArchitecture="*" publicKeyToken="6595b64144ccf1df" language="*"/></dependentAssembly></dependency>
</assembly>
"#).unwrap();
    let esc = |p: &PathBuf| p.to_string_lossy().replace('\\', "\\\\");
    let rc = out.join("app.rc");
    std::fs::write(&rc, format!(r#"#pragma code_page(65001)
1 ICON "{ico}"
1 24 "{man}"
1 VERSIONINFO
FILEVERSION {quad}
PRODUCTVERSION {quad}
FILEOS 0x40004
FILETYPE 0x1
BEGIN
  BLOCK "StringFileInfo"
  BEGIN
    BLOCK "040904b0"
    BEGIN
      VALUE "CompanyName", "Adhkar, open source"
      VALUE "FileDescription", "{description}"
      VALUE "FileVersion", "{dotted}"
      VALUE "InternalName", "{title}"
      VALUE "LegalCopyright", "GPL-3.0"
      VALUE "ProductName", "Adhkar"
      VALUE "ProductVersion", "{name}"
    END
  END
  BLOCK "VarFileInfo"
  BEGIN
    VALUE "Translation", 0x409, 1200
  END
END
"#, ico = esc(&ico), man = esc(&manifest))).unwrap();
    embed_resource::compile(&rc, embed_resource::NONE).manifest_required().unwrap();
}
