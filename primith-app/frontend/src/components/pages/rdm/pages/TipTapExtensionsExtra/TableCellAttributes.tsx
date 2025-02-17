import { Extension } from '@tiptap/core';

export const TableCellAttributes = Extension.create({
    name: 'tableCellAttributes',
  
    addGlobalAttributes() {
      return [
        {
          types: ['tableCell', 'tableHeader'],
          attributes: {
            backgroundColor: {
              default: null,
              parseHTML: element => element.getAttribute('style')?.match(/background-color: ([^;]+)/)?.[1] || null,
              renderHTML: attributes => {
                if (!attributes.backgroundColor) {
                  return {};
                }
                return {
                  style: `background-color: ${attributes.backgroundColor};`,
                };
              },
            },
          },
        },
      ];
    },
  
    addCommands() {
      return {
        setCellAttribute:
          (name: string, value: any) =>
          ({ tr, state, dispatch }) => {
            const { selection } = state;
            const cells: { pos: number }[] = [];
  
            // Handle CellSelection (multiple cells selected)
            if (selection.ranges) {
              // For each range in the selection
              selection.ranges.forEach(range => {
                state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
                  if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                    cells.push({ pos });
                  }
                });
              });
            } else {
              // Handle single cell selection
              state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
                if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                  cells.push({ pos });
                }
              });
            }
  
            if (dispatch && cells.length > 0) {
              cells.forEach(({ pos }) => {
                tr.setNodeAttribute(pos, name, value);
              });
              return true;
            }
            return false;
          },
      };
    },
  });