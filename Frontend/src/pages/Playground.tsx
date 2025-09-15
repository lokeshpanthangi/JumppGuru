import { useEffect, useRef } from "react";

export default function Playground({ playgroundData }) {
    console.log(playgroundData,"qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq" )
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing scripts
    const oldScripts = container.querySelectorAll("script");
    oldScripts.forEach(script => script.remove());

    // Extract new scripts from HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = playgroundData.html_content;
    const newScripts = tempDiv.querySelectorAll("script");

    // Append HTML without scripts
    container.innerHTML = tempDiv.innerHTML;

    // Re-run scripts
    newScripts.forEach(oldScript => {
      const newScript = document.createElement("script");
      if (oldScript.src) {
        // External script
        newScript.src = oldScript.src;
      } else {
        // Inline script
        newScript.textContent = oldScript.textContent;
      }
      // Copy attributes (e.g., type, async)
      [...oldScript.attributes].forEach(attr =>
        newScript.setAttribute(attr.name, attr.value)
      );
      container.appendChild(newScript);
    });
  }, [playgroundData.html_content]);

  return (
    <div className="flex-1 overflow-auto">
      <div
        ref={containerRef}
        className="playground-content w-full h-full"
      />
    </div>
  );
}
