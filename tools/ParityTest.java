package com.adhkar.app;

/** Prints prayer times from the Java engine as TSV for tools/test.js to compare with prayer.js. */
public class ParityTest {
    public static void main(String[] a) throws Exception {
        java.io.BufferedReader r = new java.io.BufferedReader(new java.io.InputStreamReader(System.in, "UTF-8"));
        String line;
        while ((line = r.readLine()) != null) {
            if (line.trim().isEmpty()) continue;
            String[] f = line.split("\t"); // lat lng method asr highLat y m d
            PrayerCalc.Opts o = new PrayerCalc.Opts();
            o.lat = Double.parseDouble(f[0]); o.lng = Double.parseDouble(f[1]); o.method = f[2]; o.asr = f[3]; o.highLat = f[4];
            PrayerCalc.Day d = PrayerCalc.day(Integer.parseInt(f[5]), Integer.parseInt(f[6]), Integer.parseInt(f[7]), o);
            StringBuilder sb = new StringBuilder();
            for (String k : PrayerCalc.ORDER) sb.append(d.get(k)).append('\t');
            sb.append(d.lastThird);
            System.out.println(sb);
        }
    }
}
