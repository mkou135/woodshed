import QtQuick
import MuseApi.Controls
import MuseApi.Theme
import "woodshed.js" as Engine

ExtensionBlank {
    id: root

    implicitWidth: 560
    implicitHeight: 640

    // Three buttons share this shape (colours/opacities match the original
    // "Analyse again" Rectangle); disabled buttons dim by 0.4 on top of the
    // normal hover/press opacity. `enabled` is Item's own built-in property
    // (Rectangle extends Item) — it already gates input for the MouseArea
    // below, so it is read, never redeclared.
    component WoodshedButton: Rectangle {
        id: button
        property string text: ""
        signal clicked()

        width: buttonLabel.implicitWidth + 24
        height: 30
        radius: 3
        color: Theme.buttonColor
        opacity: (buttonArea.pressed ? Theme.buttonOpacityHit
                : buttonArea.containsMouse ? Theme.buttonOpacityHover
                : Theme.buttonOpacityNormal) * (button.enabled ? 1.0 : 0.4)
        border.width: Theme.borderWidth
        border.color: Theme.strokeColor
        anchors.verticalCenter: parent.verticalCenter

        StyledTextLabel {
            id: buttonLabel
            anchors.centerIn: parent
            text: button.text
        }

        MouseArea {
            id: buttonArea
            anchors.fill: parent
            hoverEnabled: true
            onClicked: button.clicked()
        }
    }

    // State the list binds to. `result` is the PluginResult from analyseXml.
    property var result: null
    property string error: ""
    property string status: ""
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

    // The export is read through `reader`; anything the engine renders is
    // written through this one: TextDocument.saveAs is the one file-writing
    // route a 4.7 extension has (spec 2026-09-14 marks-and-exercises D5).
    TextEdit {
        id: writer
        visible: false
        textFormat: TextEdit.PlainText
    }

    function writeTemp(name, text) {
        writer.text = text
        const url = Qt.resolvedUrl("tmp/" + name)
        writer.textDocument.saveAs(url)
        if (writer.textDocument.status === TextDocument.WriteError
            || writer.textDocument.status === TextDocument.NonLocalFileError) {
            root.error = "Could not write " + name + ": " + writer.textDocument.errorString
            return null
        }
        return localPath("tmp/" + name)
    }

    function openTab(path) {
        const score = api.engraving.readScore(path, false)
        if (!score) {
            root.error = "MuseScore could not open " + path
            return null
        }
        return score
    }

    // One cursor pass over track 0 indexes every chord segment by
    // "<measure index>:<tick within the measure>" in MuseScore ticks; each
    // mark's (bar, beat) becomes that key. Marks with no chord there are
    // counted, not thrown: a rest, a pickup, a tuplet rounding.
    function applyMarks(score, marks) {
        const division = api.engraving.division
        const index = {}
        const cursor = score.newCursor()
        cursor.track = 0
        cursor.rewind(0)
        let measureNo = 0
        let measure = null
        while (cursor.segment) {
            if (cursor.measure !== measure) {
                measure = cursor.measure
                measureNo++
            }
            const el = cursor.element
            if (el && el.type === api.engraving.Element.CHORD) {
                index[measureNo + ":" + (cursor.tick - measure.firstSegment.tick)] = { tick: cursor.tick, chord: el }
            }
            if (!cursor.next()) break
        }

        let placed = 0
        score.startCmd("Woodshed marks")
        try {
            for (const m of marks) {
                const hit = index[m.bar + ":" + Math.round(m.beat * division)]
                if (!hit) continue
                if (m.kind === "colour") {
                    for (const n of hit.chord.notes) n.color = m.colour
                } else {
                    const type = m.placement === "system" ? api.engraving.Element.SYSTEM_TEXT : api.engraving.Element.STAFF_TEXT
                    const text = api.engraving.newElement(type)
                    text.text = m.text
                    text.color = m.colour
                    cursor.rewindToTick(hit.tick)
                    cursor.add(text)
                }
                placed++
            }
        } finally {
            score.endCmd()
        }
        return placed
    }

    function openAnnotatedCopy() {
        root.error = ""
        root.status = ""
        if (!root.result) return
        const name = "annotated-" + Date.now() + ".musicxml"
        const path = writeTemp(name, reader.text)
        if (!path) return
        const score = openTab(path)
        if (!score) return
        let placed = 0
        try {
            placed = applyMarks(score, root.result.marks)
        } catch (e) {
            console.log("woodshed marks:", e, e.stack)
            root.error = "Marks failed: " + (e && e.message ? e.message : e)
            return
        }
        root.status = "Annotated copy opened · placed " + placed + " of " + root.result.marks.length + " marks"
    }

    function openExercises() {
        root.error = ""
        root.status = ""
        if (!root.result || root.selected < 0) return
        const findingId = root.result.findings[root.selected].id
        let unit = null
        for (const u of root.result.units) if (u.findingIds.indexOf(findingId) >= 0) { unit = u; break }
        if (!unit) { root.error = "No practice unit carries this finding."; return }
        const path = writeTemp("exercises-" + unit.id + "-" + Date.now() + ".musicxml", unit.scoreXml)
        if (!path) return
        if (openTab(path)) root.status = "Opened exercises: " + unit.header
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

            // FlatButton and ListItemBlank (MuseApi.Controls) reach MuseScore's
            // internal Muse.Ui module (NavigationFocusBorder), which the
            // extension engine does not expose in 4.7.4: "Type ListItemBlank
            // unavailable … NavigationFocusBorder is not a type". Only
            // ExtensionBlank and StyledTextLabel load, so the button and the
            // list rows are plain Qt Quick, coloured from MuseApi.Theme.
            WoodshedButton {
                text: "Analyse again"
                onClicked: root.analyse()
            }

            WoodshedButton {
                text: "Open annotated copy"
                enabled: root.result !== null
                onClicked: root.openAnnotatedCopy()
            }

            WoodshedButton {
                text: "Open exercises for this idea"
                enabled: root.selected >= 0
                onClicked: root.openExercises()
            }
        }

        StyledTextLabel {
            visible: root.error !== ""
            width: parent.width
            wrapMode: Text.WordWrap
            text: root.error
        }

        StyledTextLabel {
            visible: root.status !== ""
            width: parent.width
            wrapMode: Text.WordWrap
            color: Theme.fontSecondaryColor
            text: root.status
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
        // own ListView needs no extra import; its rows are plain Rectangles
        // for the reason given at the button above.
        ListView {
            id: list
            width: parent.width
            height: parent.height - y - timing.height - 24
            clip: true
            spacing: 4
            model: root.result ? root.result.findings : []

            delegate: Rectangle {
                width: list.width
                height: body.implicitHeight + 16
                radius: 3
                color: index === root.selected ? Theme.accentColor
                     : rowArea.containsMouse ? Theme.buttonColor
                     : "transparent"
                opacity: index === root.selected ? Theme.accentOpacityNormal : 1.0

                MouseArea {
                    id: rowArea
                    anchors.fill: parent
                    hoverEnabled: true
                    onClicked: root.selected = (root.selected === index ? -1 : index)
                }

                Column {
                    id: body
                    x: 12
                    y: 8
                    width: parent.width - 24
                    spacing: 2

                    Row {
                        spacing: 8

                        Rectangle {
                            width: 10
                            height: 10
                            radius: 5
                            color: modelData.colour
                            anchors.verticalCenter: parent.verticalCenter
                        }

                        StyledTextLabel {
                            width: body.width - 18
                            horizontalAlignment: Text.AlignLeft
                            font: Theme.bodyBoldFont
                            text: (index + 1) + ". " + modelData.name
                                  + (modelData.language ? "  · common language" : "")
                        }
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
