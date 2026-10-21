/** "Print / PDF" on the web: render the sheet in a hidden frame and open the browser print dialog. */
const RNPrint = {
  async print(opts: { html: string; jobName?: string }): Promise<void> {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      frame.remove();
      throw new Error('Printing is not available');
    }
    doc.open();
    doc.write(opts.html);
    doc.close();
    await new Promise<void>(resolve => setTimeout(resolve, 300));
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 60000);
  },
};

export default RNPrint;
