// Prints {"file": [x, y, w, h]} (pixel box, top-left origin) of the largest
// face in each image given as an argument, using Apple's Vision framework.
// Used by scripts/portraits/crop.mjs (macOS only).
import Foundation
import Vision
import AppKit

var result: [String: [Double]] = [:]
for path in CommandLine.arguments.dropFirst() {
  guard let image = NSImage(contentsOfFile: path),
        let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
  let request = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([request])
  guard let face = (request.results ?? []).max(by: { $0.boundingBox.width < $1.boundingBox.width }) else { continue }
  let w = Double(cg.width), h = Double(cg.height), b = face.boundingBox
  result[(path as NSString).lastPathComponent] = [b.minX * w, (1 - b.maxY) * h, b.width * w, b.height * h]
}
let data = try! JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
print(String(data: data, encoding: .utf8)!)
