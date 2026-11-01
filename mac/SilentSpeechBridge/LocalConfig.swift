// Optional ~/.silentspeech/config.json, read once at launch, for forks that host their own dashboard:
//   { "allowedOrigins": ["https://you.github.io"] }
// Each entry is an exact origin as the browser sends it (scheme://host[:port], nothing after it): https only, except
// http://localhost and http://127.0.0.1. Valid ones are added to ProtocolV1.allowedOrigins (PROTOCOL.md §2).
import Foundation

enum LocalConfig {
    static let path = NSHomeDirectory() + "/.silentspeech/config.json"

    /// ProtocolV1.allowedOrigins plus the valid extra origins from config.json (no file: just the built in ones).
    static func allowedOrigins(log: LogStore) -> Set<String> {
        var origins = ProtocolV1.allowedOrigins
        guard let data = FileManager.default.contents(atPath: path) else { return origins }
        guard let all = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let list = all["allowedOrigins"] as? [Any] else {
            log.add("config.json: no \"allowedOrigins\" list in it, ignored")
            return origins
        }
        for item in list {
            if let raw = item as? String, let origin = cleanOrigin(raw) {
                if origins.insert(origin).inserted { log.add("config.json: also allowing the dashboard at \(origin)") }
            } else {
                log.add("config.json: skipped an origin (write it like https://you.github.io, no path, no / at the end; http only for localhost or 127.0.0.1)")
            }
        }
        return origins
    }

    /// "https://you.github.io" (lower case, no path, no slash at the end). Anything else: nil.
    static func cleanOrigin(_ raw: String) -> String? {
        let text = raw.trimmingCharacters(in: .whitespaces).lowercased()
        guard let parts = URLComponents(string: text), let scheme = parts.scheme, let host = parts.host, !host.isEmpty,
              parts.path.isEmpty, parts.query == nil, parts.fragment == nil, parts.user == nil, parts.password == nil,
              host.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "." || $0 == "-") }) else { return nil }
        let local = host == "localhost" || host == "127.0.0.1"
        guard scheme == "https" || (scheme == "http" && local) else { return nil }
        let port = parts.port.map { ":\($0)" } ?? ""
        let origin = scheme + "://" + host + port
        return origin == text ? origin : nil
    }
}
