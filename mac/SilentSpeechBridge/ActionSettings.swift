// "Text contact…" and "Focus music…" in the app window: what mac/set-contact.sh and mac/set-music.sh do, for people who
// downloaded the app (no repo, no scripts). A box asks, a second box shows the answer back (No is the default button),
// and only on Yes ~/.silentspeech/actions.json is written: only those entries change, everything else in the file
// stays, and the file stays private (folder 700, file 600). The contact only ever comes from this file (typed here or
// with the script), never from the WebSocket. The whole number is never logged, only its last 2 digits. Main queue only.
import AppKit
import Foundation

enum ActionSettings {
    /// Same as mac/actions.example.json: where a new actions.json starts (a downloaded app has no repo to copy it from).
    static let exampleJSON = """
    {
      "text_mom": { "kind": "imessage", "to": "", "text": "On my way!" },
      "call_back": { "kind": "imessage", "to": "", "text": "Can't talk now, call me back later" },
      "help": { "kind": "imessage", "to": "", "text": "I need help right now" },
      "volume_up": { "kind": "volume", "step": 15 },
      "focus_music": { "kind": "applemusic", "url": "https://music.apple.com/us/playlist/pure-focus/pl.f54198ad42404535be13eabf3835fb22" },
      "demo_48h": { "kind": "say", "text": "I created this demo in 48 hours" },
      "calendar": { "kind": "calendar" }
    }
    """

    enum Problem: Error {
        case unreadable
        case notJSON
        case notObject
        case cannotWrite(String)

        var text: String {
            switch self {
            case .unreadable: return "~/.silentspeech/actions.json is there but can't be read."
            case .notJSON: return "~/.silentspeech/actions.json is not valid JSON. Fix it or delete it, then try again."
            case .notObject: return "~/.silentspeech/actions.json is not a JSON object. Fix it or delete it, then try again."
            case .cannotWrite(let why): return "Could not write ~/.silentspeech/actions.json (\(why))."
            }
        }
    }

    /// What focus_music should play, from what was typed (same rules as set-music.sh).
    enum Music {
        case spotify(String)  // a spotify: URI
        case link(String)     // a music.apple.com or music:// link
        case playlist(String) // a playlist name in the Music library
        case bad(String)      // not usable: why
    }

    // MARK: actions.json

    /// actions.json as it is now, or the example when there is no file yet. A file that is there but is not a JSON
    /// object throws, and then nothing is saved (like the scripts).
    static func load() throws -> [String: Any] {
        let path = ActionRunner.configPath
        guard let data = FileManager.default.contents(atPath: path) else {
            if FileManager.default.fileExists(atPath: path) { throw Problem.unreadable }
            return (try? JSONSerialization.jsonObject(with: Data(exampleJSON.utf8))) as? [String: Any] ?? [:]
        }
        guard let object = try? JSONSerialization.jsonObject(with: data) else { throw Problem.notJSON }
        guard let all = object as? [String: Any] else { throw Problem.notObject }
        return all
    }

    /// Writes the whole file: a new private temp file next to it (never through a link), then renamed over it, so
    /// the file is never half written. Folder 700, file 600.
    static func save(_ all: [String: Any]) throws {
        let path = ActionRunner.configPath
        let dir = (path as NSString).deletingLastPathComponent
        let fm = FileManager.default
        guard JSONSerialization.isValidJSONObject(all) else { throw Problem.cannotWrite("not JSON") }
        let json: Data
        do {
            try fm.createDirectory(atPath: dir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
            try fm.setAttributes([.posixPermissions: 0o700], ofItemAtPath: dir)
            json = try JSONSerialization.data(withJSONObject: all, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
        } catch {
            throw Problem.cannotWrite(error.localizedDescription)
        }
        let bytes: [UInt8] = Array(json) + Array("\n".utf8)
        let tmp = path + ".tmp"
        _ = unlink(tmp)
        let fd = open(tmp, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, 0o600)
        guard fd >= 0 else { throw Problem.cannotWrite("error \(errno)") }
        let written = bytes.withUnsafeBufferPointer { write(fd, $0.baseAddress, $0.count) }
        let synced = fsync(fd)
        _ = close(fd)
        guard written == bytes.count, synced == 0, rename(tmp, path) == 0 else {
            let code = errno
            _ = unlink(tmp)
            throw Problem.cannotWrite("error \(code)")
        }
        try? fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: path)
    }

    /// Like set-contact.sh: text_mom, call_back and help all text `number`; each keeps its own text (or the default).
    static func withContact(_ number: String, _ all: [String: Any]) -> [String: Any] {
        var out = all
        for action in ActionRunner.textingActions {
            var entry = all[action] as? [String: Any] ?? [:]
            let text = entry["text"] as? String ?? ""
            entry["kind"] = ActionKind.imessage.rawValue
            entry["to"] = number
            entry["text"] = text.isEmpty ? (ActionRunner.defaultTexts[action] ?? "") : text
            out[action] = entry
        }
        return out
    }

    /// Same rules as set-music.sh and the app (ActionRunner.spotifyURI, appleMusicURL, cleanText).
    static func music(_ typed: String) -> Music {
        let raw = typed.trimmingCharacters(in: .whitespacesAndNewlines)
        if let uri = ActionRunner.spotifyURI(raw) { return .spotify(uri) }
        if let url = ActionRunner.appleMusicURL(raw) { return .link(url) }
        let lower = raw.lowercased()
        if ["http:", "https:", "music:", "spotify:"].contains(where: { lower.hasPrefix($0) }) {
            return .bad("Links must be music.apple.com, music:// or Spotify links (open.spotify.com/… or spotify:playlist:…).")
        }
        guard let name = ActionRunner.cleanText(raw), name.count <= 100 else {
            return .bad("Type a playlist name (at most 100 characters) or a link.")
        }
        return .playlist(name)
    }

    /// Like set-music.sh: only focus_music changes. When it already was Apple Music, a new playlist name keeps the
    /// link (tried when the playlist is missing) and a new link keeps the playlist name (tried first).
    static func withMusic(_ choice: Music, _ all: [String: Any]) -> [String: Any] {
        let old = all["focus_music"] as? [String: Any] ?? [:]
        let wasAppleMusic = (old["kind"] as? String) == ActionKind.applemusic.rawValue
        var entry: [String: Any]
        switch choice {
        case .spotify(let uri):
            entry = ["kind": ActionKind.spotify.rawValue, "uri": uri]
        case .link(let url):
            entry = ["kind": ActionKind.applemusic.rawValue, "url": url]
            if wasAppleMusic, let playlist = old["playlist"] as? String, !playlist.isEmpty { entry["playlist"] = playlist }
        case .playlist(let name):
            entry = ["kind": ActionKind.applemusic.rawValue, "playlist": name]
            if wasAppleMusic, let url = old["url"] as? String, !url.isEmpty { entry["url"] = url }
        case .bad:
            return all
        }
        var out = all
        out["focus_music"] = entry
        return out
    }

    static func describe(_ choice: Music) -> String {
        switch choice {
        case .spotify(let uri): return "Spotify \(uri)"
        case .link(let url): return "the Apple Music link \(url)"
        case .playlist(let name): return "your Music playlist \"\(name)\" (if it is missing: the focus playlist link)"
        case .bad(let why): return why
        }
    }

    /// What is in focus_music now (for the box to start with).
    static func currentMusic() -> String {
        guard let all = try? load(), let entry = all["focus_music"] as? [String: Any] else { return "" }
        for key in ["uri", "playlist", "url"] {
            if let value = entry[key] as? String, !value.isEmpty { return value }
        }
        return ""
    }

    // MARK: The boxes

    /// "Text contact…": asks for the number, shows it back, saves it on Yes. Cancel or No: nothing changes.
    static func askContact(runner: ActionRunner, log: LogStore) {
        var ask = "The texts \"Text mom I'm on my way\", \"Call me back later\" and \"I need help right now\" go to "
            + "this number. Type it with + and the country code, for example +61 4xx xxx xxx. To try it safely, use your own number first."
        while true {
            guard let typed = askText(title: "Text contact", message: ask, placeholder: "+61 4xx xxx xxx", initial: "") else { return }
            guard let number = ActionRunner.cleanContact(typed) else {
                ask = "That did not look right. Type it with + and the country code first, for example +61 4xx xxx xxx."
                continue
            }
            let shownTyped = typed.trimmingCharacters(in: .whitespacesAndNewlines)
            guard confirm(title: "Texts will go to \(number)", message: "You typed: \(shownTyped). Is that right?") else {
                ask = "OK, let's try again. The number for your texts, with + and the country code (for example +61 4xx xxx xxx):"
                continue
            }
            do {
                let current = try load()
                try save(withContact(number, current))
            } catch {
                nothingSaved(error, what: "Text contact", log: log)
                return
            }
            log.add("Text contact: text_mom, call_back and help now text the number ending in \(ActionRunner.mask(number))")
            runner.reloadIfChanged()
            return
        }
    }

    /// "Focus music…": asks for a playlist name or link, shows what will play, saves it on Yes.
    static func askMusic(runner: ActionRunner, log: LogStore) {
        var ask = "What \"Play my focus music\" plays: a playlist name from your Music library (for example Focus), "
            + "a music.apple.com link, or a Spotify link (open.spotify.com/… or spotify:playlist:…)."
        var typed = currentMusic()
        while true {
            guard let answer = askText(title: "Focus music", message: ask, placeholder: "Focus, or a link", initial: typed) else { return }
            typed = answer
            let choice = music(answer)
            if case .bad(let why) = choice {
                ask = why
                continue
            }
            guard confirm(title: "Save this focus music?", message: "Focus music will play \(describe(choice)).") else {
                ask = "OK, let's try again. A playlist name, a music.apple.com link or a Spotify link:"
                continue
            }
            do {
                let current = try load()
                try save(withMusic(choice, current))
            } catch {
                nothingSaved(error, what: "Focus music", log: log)
                return
            }
            log.add("Focus music: now plays \(describe(choice))")
            runner.reloadIfChanged()
            return
        }
    }

    /// A box with one text field. Next: what was typed. Cancel: nil.
    private static func askText(title: String, message: String, placeholder: String, initial: String) -> String? {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.addButton(withTitle: "Next")
        alert.addButton(withTitle: "Cancel")
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 320, height: 24))
        field.placeholderString = placeholder
        field.stringValue = initial
        alert.accessoryView = field
        alert.window.initialFirstResponder = field
        guard alert.runModal() == .alertFirstButtonReturn else { return nil }
        return field.stringValue
    }

    /// Yes / No. No is the default button (Return), like the scripts: only a click on Yes saves.
    private static func confirm(title: String, message: String) -> Bool {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.addButton(withTitle: "No")
        alert.addButton(withTitle: "Yes, save")
        return alert.runModal() == .alertSecondButtonReturn
    }

    private static func nothingSaved(_ error: Error, what: String, log: LogStore) {
        let text = (error as? Problem)?.text ?? error.localizedDescription
        log.add("\(what): nothing saved: \(text)")
        let alert = NSAlert()
        alert.alertStyle = .warning
        alert.messageText = "Nothing saved"
        alert.informativeText = text
        alert.addButton(withTitle: "OK")
        _ = alert.runModal()
    }
}
