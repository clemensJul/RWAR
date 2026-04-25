## Value Proposition Design

| YOUR CUSTOMER PROBLEMS / NEEDS | | KEY FUNCTIONALITIES & FEATURES |
| :--- | :--- | :--- |
| **Need / Pain** | **Critical Value** | **Promises / Features** |
| **1. Intransparente Risiken bei Grundstücks-Due-Diligence** (Veraltete 2D-Karten, langwierige/teure Bodengutachten verzögern den Kauf). | **Geschwindigkeit & visuelles Verständnis:** Sofortige Erkennung von Fließwegen und Hangdynamiken zur Anpassung der Gebäudeplanung (z. B. Platzierung der Tiefgarage). | **3D Property Digital Twin:** Basis-Visualisierung des Grundstücks in 3D statt 2D.<br><br>**Hydro-Check:** Simulation von Oberflächenabfluss und Starkregen (HQ100/300) in der 3D-Umgebung ("Flow-Paths"). |
| **2. Strikte EU-Taxonomie-Vorgaben** (Projektentwickler müssen finanzierenden Banken die Klimaresilienz des Projekts beweisen). | **Investitionssicherheit & Compliance:** Belastbarer Nachweis, dass das Projekt auch in Jahrzehnten noch sicher und finanzierbar ist. | **Future-Trend Layer:** Einbindung von IPCC-Klimaprojektionen (RCP 4.5/8.5) für Hitze und Starkregen für die Jahre 2030, 2050, 2080. |
| **3. Reine Diagnosen reichen nicht aus** ("Ich weiß jetzt, dass es ein Risiko gibt, aber was kostet mich die Behebung?"). | **Handlungsfähigkeit (Actionability):** Direkte Lösungsansätze, um Kaufpreise nachzuverhandeln oder Budgets für Schutzmaßnahmen einzuplanen. | **Actionable Advice (Empfehlungen):** Textbasierte, automatisierte Handlungsempfehlungen (z. B. "Rückstauklappe installieren", "Versickerungsfläche vergrößern"). |
| **4. Fragmentierte Datensilos** (Geodaten liegen in hunderten unterschiedlichen Formaten bei Behörden und Kommunen). | **Zeitersparnis & Single Source of Truth:** Alle relevanten Daten an einem Ort, sofort abrufbar. | **Automatisierte Daten-Pipeline (Backend):** Das automatisierte Sammeln, Bereinigen und Zusammenführen der Quellen. |

## MVP Checklist

| FEATURE | IMPORTANCE OF THE FEATURE | MVP (YES/NO) | Begründung für RAWR |
| :--- | :--- | :--- | :--- |
| **1. Automatisierte Daten-Pipeline (Backend)** | **MUST-HAVE** | **YES** | Ohne die Bereinigung und Zusammenführung der Daten funktioniert das gesamte Produkt nicht. |
| **2. 3D Digital Twin (Base Layer)** | **MUST-HAVE** | **YES** | Euer Haupt-Unterscheidungsmerkmal zu 2D-Gefahrenkarten. Zwingend für die Visualisierung. |
| **3. Hydro-Check (Flut & Starkregen)** | **CRITICAL** | **YES** | Starkregen ist für Bauträger das häufigste und akuteste finanzielle Risiko in Mitteleuropa. Liefert sofortigen Wert. |
| **4. Actionable Advice (Empfehlungen)** | **CRITICAL** | **YES** | Wandelt das Tool von einer "Karte" zu einem Planungshelfer. Wichtig für die Kaufentscheidung des Projektentwicklers. |
| **5. Future-Trend (IPCC Szenarien)** | **CRITICAL** | **YES** | Absolut notwendig, da die Banken für die Taxonomie explizit Daten für die Zukunft (2030, 2050) verlangen. |
| **6. Geo-Hazard (Erdrutsch / Alpen-Check)** | **SECONDARY** | **NO** | Sehr regional abhängig. Für den allerersten Prototypen zu komplex. Kann in Version 2.0 für alpine Kunden hinzugefügt werden. |
| **7. Aquifer-Monitor (Grundwasser / Brunnen)** | **SECONDARY** | **NO** | Datenbeschaffung (Sinking Water Tables) ist oft extrem schwer und lokal begrenzt. Verzögert den Launch und ist vorerst nur ein "Nice-to-have". |