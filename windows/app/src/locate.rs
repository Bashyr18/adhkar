//! Where you are, from Windows' own location service if it is on (Settings > Privacy > Location); otherwise the page
//! offers the city list. Answered once, within 15 seconds, then the service is left alone.
use windows::Devices::Geolocation::{GeolocationAccessStatus, Geolocator, PositionAccuracy};

use adhkar_common as ac;

use crate::app;

fn answer(j: String) {
    let j = ac::js(&j);
    ac::post(move || if let Some(a) = app() { a.post(&format!("window.__native.onLocation&&__native.onLocation({})", j)) });
}
pub fn locate() {
    std::thread::spawn(|| {
        let r = (|| -> Result<String, &'static str> {
            let access = Geolocator::RequestAccessAsync().map_err(|_| "fail")?.get().map_err(|_| "fail")?;
            if access == GeolocationAccessStatus::Denied { return Err("denied"); }
            if access != GeolocationAccessStatus::Allowed { return Err("off"); }
            let g = Geolocator::new().map_err(|_| "fail")?;
            let _ = g.SetDesiredAccuracy(PositionAccuracy::Default);
            let op = g.GetGeopositionAsync().map_err(|_| "fail")?;
            /* give up after 15 seconds rather than wait for ever */
            let (tx, rx) = std::sync::mpsc::channel();
            std::thread::spawn(move || { let _ = tx.send(op.get()); });
            let pos = rx.recv_timeout(std::time::Duration::from_secs(15)).map_err(|_| "fail")?.map_err(|_| "fail")?;
            let c = pos.Coordinate().map_err(|_| "fail")?;
            let p = c.Point().map_err(|_| "fail")?.Position().map_err(|_| "fail")?;
            let acc = c.Accuracy().unwrap_or(0.0);
            Ok(serde_json::json!({ "lat": p.Latitude, "lng": p.Longitude, "acc": acc }).to_string())
        })();
        answer(r.unwrap_or_else(|e| format!("{{\"error\":\"{}\"}}", e)));
    });
}
