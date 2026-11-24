import XCTest
@testable import Adhkar

final class StoreAndSecurityTests: XCTestCase {
    func testStateMirrorAtomicSaveLoadAndMonotonicSequence() {
        let tmpDir = FileManager.default.temporaryDirectory.appendingPathComponent("adhkar-test-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: tmpDir) }
        let defaults = UserDefaults(suiteName: "test.\(UUID().uuidString)")!
        let store = Store(defaults: defaults, baseDir: tmpDir)

        XCTAssertNil(store.loadState())

        store.saveState("{\"v\":10,\"step\":1}", seq: 5, synchronous: true)
        XCTAssertEqual(store.loadState(), "{\"v\":10,\"step\":1}")

        // Out-of-order older write must not clobber newer write
        store.saveState("{\"v\":10,\"step\":0}", seq: 3, synchronous: true)
        XCTAssertEqual(store.loadState(), "{\"v\":10,\"step\":1}")

        store.saveState("{\"v\":10,\"step\":2}", seq: 6, synchronous: true)
        XCTAssertEqual(store.loadState(), "{\"v\":10,\"step\":2}")
    }

    func testAudioAllowlistsRejectTraversalAndUnknownHosts() {
        XCTAssertTrue(AudioManager.safeName("h42.mp3"))
        XCTAssertTrue(AudioManager.safeName("q001001.mp3"))
        XCTAssertFalse(AudioManager.safeName("../evil.mp3"))
        XCTAssertFalse(AudioManager.safeName("foo/bar.mp3"))
        XCTAssertFalse(AudioManager.safeName("script.js"))

        XCTAssertTrue(AudioManager.allowedURL("https://www.hisnmuslim.com/audio/ar/75.mp3"))
        XCTAssertTrue(AudioManager.allowedURL("https://everyayah.com/data/Alafasy_128kbps/018001.mp3"))
        XCTAssertFalse(AudioManager.allowedURL("https://evil.example/75.mp3"))
        XCTAssertFalse(AudioManager.allowedURL("https://www.hisnmuslim.com/audio/ar/../secret.mp3"))

        XCTAssertTrue(AudioManager.allowedAssetPath("audio/dua-1.mp3"))
        XCTAssertFalse(AudioManager.allowedAssetPath("audio/../index.html"))
    }

    func testWebAssetSchemeHandlerBlocksTraversal() throws {
        let tmpDir = FileManager.default.temporaryDirectory.appendingPathComponent("adhkar-www-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tmpDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tmpDir) }

        let index = tmpDir.appendingPathComponent("index.html")
        try Data("<h1>Adhkar</h1>".utf8).write(to: index)

        let handler = WebAssetSchemeHandler(wwwRoot: tmpDir)
        XCTAssertEqual(handler.resolvedFileURL(for: "/"), index.standardizedFileURL)
        XCTAssertEqual(handler.resolvedFileURL(for: "/index.html"), index.standardizedFileURL)
        XCTAssertNil(handler.resolvedFileURL(for: "/../secret.txt"))
        XCTAssertNil(handler.resolvedFileURL(for: "/does-not-exist.js"))
    }

    func testDeepLinkRouteParsing() {
        XCTAssertEqual(SceneDelegate.route(from: URL(string: "adhkar://route/salah")!), "#/salah")
        XCTAssertEqual(SceneDelegate.route(from: URL(string: "adhkar://route/r/morning/0")!), "#/r/morning/0")
        XCTAssertNil(SceneDelegate.route(from: URL(string: "https://example.com/route/salah")!))
    }

    func testArabicLocalizationDigits() {
        L.ar = true
        XCTAssertEqual(L.n("12:34"), "١٢:٣٤")
        XCTAssertEqual(L.prayer("fajr"), "الفجر")
        L.ar = false
        XCTAssertEqual(L.n("12:34"), "12:34")
        XCTAssertEqual(L.prayer("fajr"), "Fajr")
    }
}
