include!("../common/build_support.rs");
fn main() {
    adhkar_build("Adhkar Setup", "Installs Adhkar, remembrance for every moment");
    /* the program it installs: dist/Adhkar-Windows.exe, built first by tools/build_windows.py */
    let p = std::env::var("ADHKAR_PAYLOAD").unwrap_or_else(|_| {
        std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("..").join("..").join("dist").join("Adhkar-Windows.exe").to_string_lossy().into_owned()
    });
    println!("cargo:rustc-env=ADHKAR_PAYLOAD={}", p);
    println!("cargo:rerun-if-env-changed=ADHKAR_PAYLOAD");
    println!("cargo:rerun-if-changed={}", p);
    println!("cargo:rerun-if-changed=src/page.html");
}
