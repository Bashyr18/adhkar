include!("../common/build_support.rs");
fn main() {
    adhkar_build("Adhkar", "Adhkar, remembrance for every moment");
    /* the app, zipped by tools/build_windows.py */
    let zip = std::env::var("ADHKAR_APP_ZIP").unwrap_or_else(|_| {
        let d = std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("..").join("..").join("build").join("windows").join("app.zip");
        d.to_string_lossy().into_owned()
    });
    println!("cargo:rustc-env=ADHKAR_APP_ZIP={}", zip);
    println!("cargo:rerun-if-env-changed=ADHKAR_APP_ZIP");
    println!("cargo:rerun-if-changed={}", zip);
    println!("cargo:rerun-if-changed=../shim.js");
}
