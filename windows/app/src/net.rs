//! The only things Adhkār fetches from the internet, and only when you ask: recitations you choose to download, and a
//! new version when you check for one. Windows' own TLS is used, and no redirect is followed blindly: each hop is
//! checked against the hosts allowed for that purpose.
use std::fs;
use std::io::Read;
use std::path::Path;
use std::sync::OnceLock;
use std::time::Duration;

pub fn agent_no_redirect() -> &'static ureq::Agent {
    static A: OnceLock<ureq::Agent> = OnceLock::new();
    A.get_or_init(|| {
        let mut b = ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(15)).timeout_read(Duration::from_secs(30)).redirects(0).user_agent("Adhkar-Windows");
        if let Ok(t) = native_tls::TlsConnector::new() { b = b.tls_connector(std::sync::Arc::new(t)); }
        b.build()
    })
}

/* follows up to five redirects by hand, each one only to a host `ok` allows */
pub fn open(url: &str, ok: &dyn Fn(&str) -> bool) -> Result<ureq::Response, String> {
    let mut u = url.to_string();
    for _ in 0..5 {
        if u.contains('\\') || u.bytes().any(|b| b <= 0x20 || b == 0x7f) { return Err("invalid url".into()); }
        if !ok(&u) { return Err(format!("host not allowed: {}", host_of(&u))); }
        let r = match agent_no_redirect().get(&u).set("Accept", "application/vnd.github+json, application/octet-stream, */*").call() {
            Ok(r) => r,
            Err(ureq::Error::Status(_, r)) => r,
            Err(e) => return Err(e.to_string()),
        };
        let code = r.status();
        if (300..400).contains(&code) {
            let loc = r.header("Location").ok_or("redirect without a place")?.trim().to_string();
            if loc.is_empty() || loc.contains('\\') || loc.bytes().any(|b| b <= 0x20 || b == 0x7f) { return Err("invalid redirect".into()); }
            u = if loc.starts_with("https://") || loc.starts_with("http://") {
                loc
            } else if let Some(rest) = loc.strip_prefix("//") {
                format!("https://{}", rest)
            } else if loc.starts_with('/') {
                format!("https://{}{}", host_of(&u), loc)
            } else {
                let base = u.split(['?', '#']).next().unwrap_or(&u);
                let dir = base.rsplit_once('/').map(|x| x.0).unwrap_or(base);
                format!("{}/{}", dir, loc)
            };
            continue;
        }
        if code != 200 { return Err(format!("http {}", code)); }
        return Ok(r);
    }
    Err("too many redirects".into())
}
pub fn host_of(u: &str) -> String {
    let rest = u.split_once("://").map(|x| x.1).unwrap_or("");
    let auth = rest.split(['/', '\\', '?', '#']).next().unwrap_or("");
    if auth.contains('@') { return String::new(); }
    auth.split(':').next().unwrap_or("").to_lowercase()
}
pub fn text(r: ureq::Response, max: u64) -> Result<String, String> {
    let mut s = String::new();
    r.into_reader().take(max).read_to_string(&mut s).map_err(|e| e.to_string())?;
    Ok(s)
}
pub fn sha256(path: &Path) -> Option<String> {
    use sha2::{Digest, Sha256};
    let mut f = fs::File::open(path).ok()?;
    let mut h = Sha256::new();
    let mut buf = vec![0u8; 1 << 20];
    loop { let n = f.read(&mut buf).ok()?; if n == 0 { break; } h.update(&buf[..n]); }
    Some(h.finalize().iter().map(|b| format!("{:02x}", b)).collect())
}
