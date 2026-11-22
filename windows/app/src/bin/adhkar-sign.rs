//! Ed25519 signing helper for Windows release SHA256SUMS.txt files.
//! Key file holds a 32-byte hex seed (kept strictly inside gitignored keystore/).
//! Usage:
//!   adhkar-sign pubkey <key-file>
//!   adhkar-sign sign <key-file> <file> [out.sig]
//!   adhkar-sign verify <pubkey-hex> <file> <sig-file>
use std::{env, fs, process};

use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};

fn decode_hex<const N: usize>(s: &str) -> Result<[u8; N], String> {
    let s = s.trim();
    if s.len() != N * 2 { return Err(format!("expected {} hex chars, got {}", N * 2, s.len())); }
    let mut out = [0u8; N];
    for i in 0..N {
        out[i] = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).map_err(|e| e.to_string())?;
    }
    Ok(out)
}
fn encode_hex(b: &[u8]) -> String { b.iter().map(|x| format!("{:02x}", x)).collect() }

fn load_key(path: &str) -> Result<SigningKey, String> {
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    Ok(SigningKey::from_bytes(&decode_hex::<32>(&raw)?))
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let res = (|| -> Result<(), String> {
        match args.first().map(|s| s.as_str()) {
            Some("pubkey") if args.len() == 2 => {
                let sk = load_key(&args[1])?;
                println!("{}", encode_hex(sk.verifying_key().as_bytes()));
            }
            Some("sign") if args.len() == 3 || args.len() == 4 => {
                let sk = load_key(&args[1])?;
                let data = fs::read(&args[2]).map_err(|e| e.to_string())?;
                let sig = sk.sign(&data);
                let out = args.get(3).cloned().unwrap_or_else(|| format!("{}.sig", args[2]));
                fs::write(&out, format!("{}\n", encode_hex(&sig.to_bytes()))).map_err(|e| e.to_string())?;
                println!("signed {} -> {}", args[2], out);
            }
            Some("verify") if args.len() == 4 => {
                let vk = VerifyingKey::from_bytes(&decode_hex::<32>(&args[1])?).map_err(|e| e.to_string())?;
                let data = fs::read(&args[2]).map_err(|e| e.to_string())?;
                let sig_hex = fs::read_to_string(&args[3]).map_err(|e| e.to_string())?;
                let sig = Signature::from_bytes(&decode_hex::<64>(&sig_hex)?);
                vk.verify(&data, &sig).map_err(|_| "signature mismatch".to_string())?;
                println!("ok");
            }
            _ => return Err("usage: adhkar-sign pubkey|sign|verify ...".into()),
        }
        Ok(())
    })();
    if let Err(e) = res {
        eprintln!("error: {}", e);
        process::exit(1);
    }
}
