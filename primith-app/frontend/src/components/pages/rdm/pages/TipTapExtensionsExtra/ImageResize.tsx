// src/extensions/ImageResize.tsx
import React from 'react';
import Image from '@tiptap/extension-image';
import ReactDOMServer from 'react-dom/server';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

const ImageResize = Image.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      style: {
        default: 'width: 100%; height: auto; cursor: pointer;',
        parseHTML: (element: HTMLElement) => {
          const width = element.getAttribute('width');
          return width
            ? `width: ${width}px; height: auto; cursor: pointer;`
            : element.style.cssText;
        },
      },
      title: { default: null },
      loading: { default: null },
      srcset: { default: null },
      sizes: { default: null },
      crossorigin: { default: null },
      usemap: { default: null },
      ismap: { default: null },
      width: { default: null },
      height: { default: null },
      referrerpolicy: { default: null },
      longdesc: { default: null },
      decoding: { default: null },
      class: { default: null },
      id: { default: null },
      name: { default: null },
      draggable: { default: true },
      tabindex: { default: null },
      'aria-label': { default: null },
      'aria-labelledby': { default: null },
      'aria-describedby': { default: null },
    };
  },

  addNodeView() {
    return (props) => {
      const { node, editor, getPos } = props;
      const {
        view,
        options: { editable },
      } = editor;
      const style =
        node.attrs.style || 'width: 100%; height: auto; cursor: pointer;';

      // Create a wrapper element.
      const wrapper = document.createElement('div');
      wrapper.className = 'relative flex';
      wrapper.style.justifyContent = 'flex-start'; // Set initial alignment

      // Create the container for the image.
      const container = document.createElement('div');
      container.className = 'group relative inline-block';
      // Override default margins and set initial styles
      container.style.cssText =
        style +
        ' margin: 0px; padding: 0px; display: inline-block; vertical-align: top;' +
        (editable ? 'border: 1px dashed #6C6C6C;' : '');

      // Create the image element.
      const img = document.createElement('img');
      img.className = 'rounded-md cursor-pointer transition-all';
      Object.entries(node.attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          img.setAttribute(key, value as string);
        }
      });
      container.appendChild(img);
      wrapper.appendChild(container);

      // Create a "controls" element to hold resize dots and alignment buttons.
      // We use opacity and pointer-events so that controls remain in the DOM.
      const controls = document.createElement('div');
      controls.style.position = 'absolute';
      controls.style.top = '0';
      controls.style.left = '0';
      controls.style.right = '0';
      controls.style.bottom = '0';
      controls.style.opacity = '0';
      controls.style.pointerEvents = 'none';
      controls.style.transition = 'opacity 0.2s ease-in-out';
      controls.style.zIndex = '50';
      // Prevent clicks on controls from bubbling.
      controls.addEventListener('click', (e) => e.stopPropagation());
      container.appendChild(controls);

      // Function to dispatch updated attributes back to TipTap.
      const dispatchNodeView = () => {
        if (typeof getPos === 'function') {
          const newAttrs = { ...node.attrs, style: container.style.cssText };
          view.dispatch(
            view.state.tr.setNodeMarkup(getPos(), undefined, newAttrs),
          );
        }
      };

      if (editable) {
        // --- Create Resize Dots ---
        const dotsContainer = document.createElement('div');
        dotsContainer.style.position = 'absolute';
        dotsContainer.style.top = '0';
        dotsContainer.style.left = '0';
        dotsContainer.style.right = '0';
        dotsContainer.style.bottom = '0';
        const dotClasses =
          'absolute w-3 h-3 bg-primary-500 rounded-full shadow-sm hover:bg-primary-600';
        // Four corner positions.
        const dotsPositions = [
          { top: '-6px', left: '-6px', cursor: 'nwse-resize' },
          { top: '-6px', right: '-6px', cursor: 'nesw-resize' },
          { bottom: '-6px', left: '-6px', cursor: 'nesw-resize' },
          { bottom: '-6px', right: '-6px', cursor: 'nwse-resize' },
        ];
        dotsPositions.forEach((pos, index) => {
          const dot = document.createElement('div');
          dot.className = dotClasses;
          dot.style.zIndex = '10';
          Object.entries(pos).forEach(([prop, val]) => {
            dot.style.setProperty(prop, val as string);
          });
          let isResizing = false;
          let startX: number, startWidth: number;
          dot.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startWidth = container.offsetWidth;
            const onMouseMove = (e: MouseEvent) => {
              if (!isResizing) return;
              const deltaX =
                index % 2 === 0 ? -(e.clientX - startX) : e.clientX - startX;
              const newWidth = startWidth + deltaX;
              container.style.width = `${newWidth}px`;
              img.style.width = `${newWidth}px`;
            };
            const onMouseUp = () => {
              if (isResizing) isResizing = false;
              dispatchNodeView();
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          });
          dot.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault();
            isResizing = true;
            startX = e.touches[0].clientX;
            startWidth = container.offsetWidth;
            const onTouchMove = (e: TouchEvent) => {
              if (!isResizing) return;
              const deltaX =
                index % 2 === 0
                  ? -(e.touches[0].clientX - startX)
                  : e.touches[0].clientX - startX;
              const newWidth = startWidth + deltaX;
              container.style.width = `${newWidth}px`;
              img.style.width = `${newWidth}px`;
            };
            const onTouchEnd = () => {
              if (isResizing) isResizing = false;
              dispatchNodeView();
              document.removeEventListener('touchmove', onTouchMove);
              document.removeEventListener('touchend', onTouchEnd);
            };
            document.addEventListener('touchmove', onTouchMove, {
              passive: false,
            });
            document.addEventListener('touchend', onTouchEnd);
          });
          dotsContainer.appendChild(dot);
        });
        controls.appendChild(dotsContainer);

        // --- Create Alignment Buttons ---
        const alignmentContainer = document.createElement('div');
        alignmentContainer.className =
          'absolute top-0 left-1/2 transform -translate-x-1/2 flex gap-2 p-1 bg-white rounded-md border border-gray-200 shadow-sm';
        const createAlignButton = (
          IconComponent: React.ComponentType<{ className?: string }>,
          align: 'left' | 'center' | 'right',
        ) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className =
            'flex items-center justify-center px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded';
          const iconString = ReactDOMServer.renderToString(
            <IconComponent className="h-4 w-4" />,
          );
          btn.innerHTML = iconString;

          btn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Ensure alignment is applied immediately
            let newMargin = '';
            let newDisplay = 'inline-block';

            if (align === 'left') {
              newMargin = '0 auto 0 0'; // Align left
              wrapper.style.justifyContent = 'flex-start';
            } else if (align === 'center') {
              newMargin = '0 auto'; // Align center
              wrapper.style.justifyContent = 'center';
            } else if (align === 'right') {
              newMargin = '0 0 0 auto'; // Align right
              wrapper.style.justifyContent = 'flex-end';
            }

            // Apply new styles
            container.style.margin = newMargin;
            container.style.display = newDisplay;
            img.style.margin = '0px'; // Remove margin from the image
            img.style.display = 'block'; // Ensure image is block-level

            // **Persist the change in TipTap state**
            dispatchNodeView();
          });

          return btn;
        };

        alignmentContainer.appendChild(createAlignButton(AlignLeft, 'left'));
        alignmentContainer.appendChild(
          createAlignButton(AlignCenter, 'center'),
        );
        alignmentContainer.appendChild(createAlignButton(AlignRight, 'right'));
        controls.appendChild(alignmentContainer);
      }

      // On container click, show the controls (do not toggle off).
      container.addEventListener('click', (e) => {
        e.stopPropagation();
        controls.style.opacity = '1';
        controls.style.pointerEvents = 'auto';
      });

      // Hide controls when clicking anywhere outside.
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target as Node)) {
          controls.style.opacity = '0';
          controls.style.pointerEvents = 'none';
        }
      });

      return { dom: wrapper };
    };
  },
});

export { ImageResize };
export default ImageResize;
