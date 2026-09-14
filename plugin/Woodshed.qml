import QtQuick
import MuseApi.Controls
import MuseApi.Theme
import "woodshed.js" as Engine

ExtensionBlank {
    id: root

    implicitWidth: 560
    implicitHeight: 640

    // State the list binds to. `result` is the PluginResult from analyseXml.
    property var result: null
    property string error: ""
    property int selected: -1
    property real exportMs: 0

    // MuseScore has no file-reading API for a 4.7 extension. Qt Quick's
    // TextDocument.source loads a local file into a text editor with no
    // gate, so the export is read back through this hidden TextEdit
    // (spec 2026-09-14 "What MuseScore 4.7.4 offers").
    TextEdit {
        id: reader
        visible: false
        readOnly: true
        textFormat: TextEdit.PlainText
    }

    function localPath(relative) {
        // Qt.resolvedUrl gives file:///… with spaces as %20; writeScore wants
        // a plain POSIX path, and the default extensions folder is under
        // "Application Support".
        const encoded = Qt.resolvedUrl(relative).toString().replace(/^file:\/\//, "")
        try {
            return decodeURIComponent(encoded)
        } catch (e) {
            // A stray "%" in a folder name is the only way in here.
            if (e instanceof URIError) return encoded
            throw e
        }
    }

    function analyse() {
        root.error = ""
        root.result = null
        root.selected = -1

        const score = api.engraving.curScore
        if (!score) {
            root.error = "Open a score first."
            return
        }

        const path = localPath("tmp/solo.musicxml")
        const t0 = Date.now()
        const ok = api.engraving.writeScore(score, path, "musicxml")
        root.exportMs = Date.now() - t0
        if (!ok) {
            root.error = "MuseScore refused to export the score."
            return
        }

        reader.textDocument.source = ""
        reader.textDocument.source = Qt.resolvedUrl("tmp/solo.musicxml")
        if (reader.textDocument.status !== TextDocument.Loaded) {
            root.error = "Could not read the export back (status " + reader.textDocument.status + "): " + reader.textDocument.errorString
            return
        }
        const xml = reader.text
        if (!xml || xml.indexOf("<score-partwise") < 0) {
            root.error = "The export is not MusicXML."
            return
        }

        try {
            root.result = Engine.woodshed.analyseXml(xml)
        } catch (e) {
            console.log("woodshed:", e, e.stack)
            root.error = "" + (e && e.message ? e.message : e)
        }
    }

    function promptsFor(findingId) {
        if (!root.result) return []
        for (const u of root.result.units) {
            if (u.findingIds.indexOf(findingId) >= 0) return [u.header].concat(u.prompts)
        }
        return []
    }

    Component.onCompleted: analyse()

    Column {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12

        Row {
            width: parent.width
            spacing: 12

            StyledTextLabel {
                text: root.result && root.result.title ? root.result.title : "Woodshed"
                font: Theme.largeBodyBoldFont
                anchors.verticalCenter: parent.verticalCenter
            }

            FlatButton {
                text: "Analyse again"
                onClicked: root.analyse()
            }
        }

        StyledTextLabel {
            visible: root.error !== ""
            width: parent.width
            wrapMode: Text.WordWrap
            text: root.error
        }

        StyledTextLabel {
            visible: root.result !== null && root.result.warnings.length > 0
            width: parent.width
            wrapMode: Text.WordWrap
            color: Theme.fontSecondaryColor
            text: root.result ? root.result.warnings.join("\n") : ""
        }

        // StyledListView (MuseApi.Controls) imports an "internal" folder
        // this MuseScore 4.7.4 build's module does not ship, so the panel
        // fails to load with "Type StyledListView unavailable". Qt Quick's
        // own ListView needs no extra import and renders the same delegate.
        ListView {
            id: list
            width: parent.width
            height: parent.height - y - timing.height - 24
            clip: true
            spacing: 4
            model: root.result ? root.result.findings : []

            delegate: ListItemBlank {
                width: list.width
                height: body.implicitHeight + 16
                isSelected: index === root.selected
                onClicked: root.selected = (root.selected === index ? -1 : index)

                Column {
                    id: body
                    x: 12
                    y: 8
                    width: parent.width - 24
                    spacing: 2

                    StyledTextLabel {
                        width: parent.width
                        horizontalAlignment: Text.AlignLeft
                        font: Theme.bodyBoldFont
                        text: (index + 1) + ". " + modelData.name
                              + (modelData.language ? "  · common language" : "")
                    }

                    StyledTextLabel {
                        width: parent.width
                        horizontalAlignment: Text.AlignLeft
                        color: Theme.fontSecondaryColor
                        text: modelData.location + "  · " + modelData.confidenceLabel
                              + "  · " + modelData.detectedBy.join(", ")
                              + (modelData.occurrences > 1 ? "  · ×" + modelData.occurrences : "")
                    }

                    Repeater {
                        model: index === root.selected ? root.promptsFor(modelData.id) : []

                        StyledTextLabel {
                            width: body.width
                            horizontalAlignment: Text.AlignLeft
                            wrapMode: Text.WordWrap
                            text: modelData
                        }
                    }
                }
            }
        }

        StyledTextLabel {
            id: timing
            width: parent.width
            horizontalAlignment: Text.AlignLeft
            color: Theme.fontSecondaryColor
            text: root.result
                  ? "export " + Math.round(root.exportMs) + " ms · engine "
                    + Math.round(root.result.timing.total) + " ms"
                    + (root.result.tune ? " · " + root.result.tune : "")
                  : ""
        }
    }
}
