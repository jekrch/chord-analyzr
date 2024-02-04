import { Stave, StaveModifier, Glyph, Flow, Vex } from 'vexflow';

class CustomAccidentalKeySignature extends StaveModifier {
  accidentals: string[];

  constructor(accidentals: string[]) {
    super();
    this.accidentals = accidentals; // e.g., ["b", "#"]
  }


  draw(stave: Stave): void {
    let xPosition = stave.getNoteStartX() - 30; // Adjust starting X position for the first accidental

    this.accidentals.forEach((accidentalType) => {

        // Determine the glyph code for the accidental
      let glyphCode: string;
      switch (accidentalType) {
        case "#":
          glyphCode = "accidentalSharp"; // SMuFL code for sharp
          break;
        case "b":
          glyphCode = "accidentalFlat"; // SMuFL code for flat
          break;
        case "n":
          glyphCode = "natural"; // SMuFL code for natural
          break;
        // Add more cases as needed
        default:
          throw new Error("Unsupported accidental type");
      }

      const glyph = new Glyph(glyphCode, 40); // Adjust size as needed
      glyph.render(stave.getContext()!, xPosition, stave.getYForLine(0));
      xPosition += 10; // Adjust spacing between accidentals as needed
    });
  }
}
