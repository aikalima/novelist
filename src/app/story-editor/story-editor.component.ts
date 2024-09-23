import {
  Component,
  ElementRef,
  ViewChild,
  Renderer2,
  AfterViewInit,
  Input,
} from '@angular/core';

import { HttpClient} from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const DEFAULT_PROTAGONIST = 'Sir Cedric is a valiant knight, distinguished by his unwavering honor and deep faith. Draped in worn armor, he is a beacon of resilience, navigating through treacherous medieval landscapes with a steadfast heart'
const DEFAULT_OUTLINE = 'In the heart of the Dark Ages, a lone knight named Sir Cedric embarks on a perilous quest to find the fabled Holy Grail. Guided by whispers of prophecy and faith, he ventures through plague-ridden villages, cursed forests, and desolate castles. Along the way, he faces vengeful spirits, treacherous lords, and ancient riddles that test his courage and virtue. Haunted by visions of the Grail’s power, Sir Cedric must navigate a world where loyalty is scarce, and hope is fragile. His journey promises redemption for a kingdom on the brink of ruin—or his own downfall.'

@Component({
  selector: 'app-story-editor',
  templateUrl: './story-editor.component.html',
  styleUrls: ['./story-editor.component.css'],
  standalone: true,
})
export class StoryEditorComponent implements AfterViewInit {
  @Input() protagonist: string = '';
  @Input() outline: string = '';
  @Input() title: string = '';
  @Input() author: string = '';


  @ViewChild('editorContainer', { static: true })
  editorContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('editorRef', { static: true })
  editor!: ElementRef<HTMLDivElement>;

  constructor(private renderer: Renderer2, private http: HttpClient) {}

  ngAfterViewInit() {
    const firstEditor = this.editor.nativeElement;
    this.setEditorHeight(firstEditor);
    this.monitorEditor(firstEditor);
    this.insertPageNumberAtStart();
  }

  // Method to load text into editors while respecting constraints
  loadTextIntoEditors(text: string) {
    // Clear existing content
    this.editorContainer.nativeElement.innerHTML = '';
  
    // Initialize variables
    const maxLinesPerPage = 30;
    const maxPageHeight = this.calculateEditorHeight(maxLinesPerPage);
    let pageNumber = 1;
  
    // Split the text into paragraphs
    const paragraphs = text.split(/\r?\n\r?\n/);
  
    // Create the first editor box
    this.insertPageNumber(pageNumber);
    let currentEditor = this.createEditor();
    let currentContent = '';
  
    paragraphs.forEach((paragraph, index) => {
      const paragraphHTML = `<p>${paragraph.trim()}</p>`;
      currentContent += paragraphHTML;
  
      // Temporarily set the content to measure height
      this.renderer.setProperty(currentEditor, 'innerHTML', currentContent);
      const contentHeight = currentEditor.scrollHeight;
  
      if (contentHeight > maxPageHeight) {
        // Remove the last paragraph and create a new editor
        currentContent = currentContent.replace(paragraphHTML, '');
        this.renderer.setProperty(currentEditor, 'innerHTML', currentContent);
  
        // Create a new page
        pageNumber++;
        this.insertPageNumber(pageNumber);
        currentEditor = this.createEditor();
        currentContent = paragraphHTML;
        this.renderer.setProperty(currentEditor, 'innerHTML', currentContent);
      }
  
      // If it's the last paragraph, set the content
      if (index === paragraphs.length - 1) {
        this.renderer.setProperty(currentEditor, 'innerHTML', currentContent);
      }
    });
  }

  // Method to create a new editor with content
  createEditorWithContent(content: string, pageNumber: number) {
    // Insert page number before the editor
    this.insertPageNumber(pageNumber);
  
    // Create a new contenteditable div
    const newEditor = this.renderer.createElement('div');
    this.renderer.addClass(newEditor, 'editor');
    this.renderer.setAttribute(newEditor, 'contenteditable', 'true');
  
    // Convert content lines into HTML with <div> wrappers
    const lines = content.split('\n');
    const formattedContent = lines.map(line => `<div>${line}</div>`).join('');
  
    this.renderer.setProperty(newEditor, 'innerHTML', formattedContent);
  
    // Set the editor's height to 30 lines
    this.setEditorHeight(newEditor);
  
    // Append the new editor box to the container
    this.renderer.appendChild(this.editorContainer.nativeElement, newEditor);
  
    // Monitor the new box for line count
    this.monitorEditor(newEditor);
  }

  // The rest of your existing methods remain unchanged

  setEditorHeight(editor: HTMLDivElement) {
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
    const editorHeight = lineHeight * 34 + 'px';
    this.renderer.setStyle(editor, 'height', editorHeight);
  }

  // Method to calculate editor height based on number of lines
  calculateEditorHeight(lines: number): number {
    const lineHeight = 1.6 * 16; // Assuming 1.6 line-height and 16px font-size
    return lines * lineHeight;
  }

  // Method to create a new editor and append it to the container
  createEditor(): HTMLDivElement {
    const newEditor = this.renderer.createElement('div');
    this.renderer.addClass(newEditor, 'editor');
    this.renderer.setAttribute(newEditor, 'contenteditable', 'true');

    this.setEditorHeight(newEditor);
    this.renderer.appendChild(this.editorContainer.nativeElement, newEditor);
    this.monitorEditor(newEditor);

    return newEditor;
  }

  handleTabPress(editor: HTMLDivElement, wordCount?: number) {
    // Get the current selection and cursor position
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
  
    const range = selection.getRangeAt(0);
  
    // Get the user's context (last 200 words)
    const userContext = this.getStoryContext(editor, range);
  
    // Placeholder for generated text
    const placeholderText = '[Musing ...]';
  
    // Insert placeholder text at the cursor position
    const textNode = document.createTextNode(placeholderText);
    range.deleteContents();
    range.insertNode(textNode);
  
    // Move the cursor after the inserted text
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  
    // Call the method to generate text
    this.generateCompletion(userContext, wordCount).then((generatedText) => {
      // Ensure a space before the generated text if needed
      const editorText = editor.innerText.replace(placeholderText, "") || '';
      const lastChar = editorText.slice(-1);
      // Check if the last character is a space or punctuation
      const needsSpace = lastChar && !/[.!?]\s*$/.test(lastChar) && lastChar !== ' '; 
      // Append the generated text, ensuring proper spacing
      const finalGeneratedText = needsSpace ? ` ${generatedText}` : generatedText;
  
      // Replace the placeholder with the generated text
      textNode.textContent = finalGeneratedText;
    });
  }

  async generateCompletion(storyContext: string, wordCount?: number): Promise<string> {
    const protagonist = localStorage.getItem('storyProtagonist') || DEFAULT_PROTAGONIST;
    const outline = localStorage.getItem('storyOutline') || DEFAULT_OUTLINE;


    const payload = {
      protagonist: protagonist,
      outline: outline,
      author: "Herman Hesse",
      storyContext: storyContext,
      wordCount: wordCount,
    };
  
    try {
      const response = await firstValueFrom(
        this.http.post<{ generatedText: string }>('/api/generate', payload)
      );
      const generatedText = response.generatedText;
      return generatedText.trim();
    } catch (error) {
      console.error('Error generating completion:', error);
      return '[Error generating completion]';
    }
  }

  // getUserSentence(editor: HTMLDivElement, range: Range): string {
  //   // Get the text content up to the cursor position
  //   const preCursorRange = document.createRange();
  //   preCursorRange.selectNodeContents(editor);
  //   preCursorRange.setEnd(range.startContainer, range.startOffset);
  
  //   const preCursorContent = preCursorRange.toString();
  
  //   // Extract the last sentence
  //   const sentences = preCursorContent.match(/[^.!?]*[.!?]/g);
  //   const lastSentence = sentences ? sentences[sentences.length - 1] : preCursorContent;
  
  //   return lastSentence.trim();
  // }
  getStoryContext(editor: HTMLDivElement, range: Range): string {
    // Get the text content up to the cursor position
    const preCursorRange = document.createRange();
    preCursorRange.selectNodeContents(editor);
    preCursorRange.setEnd(range.startContainer, range.startOffset);
  
    const preCursorContent = preCursorRange.toString();
  
    // Split the content into words
    const words = preCursorContent.trim().split(/\s+/);
    const totalWords = words.length;
  
    // Get the last 200 words or fewer if not enough words
    const contextWords = words.slice(Math.max(totalWords - 200, 0));
  
    // Join the words back into a string
    const context = contextWords.join(' ');
  
    return context;
  }

  openWordCountPrompt(editor: HTMLDivElement) {
    const wordCountStr = prompt('Enter the number of words to generate:');
    if (wordCountStr !== null) {
      const wordCount = parseInt(wordCountStr.trim(), 10);
      if (!isNaN(wordCount) && wordCount > 0) {
        this.handleTabPress(editor, wordCount);
      } else {
        alert('Please enter a valid positive number.');
      }
    }
  }

  monitorEditor(editor: HTMLDivElement) {
    // Existing input listener
    this.renderer.listen(editor, 'input', () => {
      const lines = this.getLineCount(editor);
  
      if (lines > 30 && !editor.getAttribute('data-maxed')) {
        editor.setAttribute('data-maxed', 'true');
        this.createNewEditorBox();
      }
    });
  
    // Add keydown listener for Tab key
    this.renderer.listen(editor, 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault(); // Prevent default tab behavior
        this.handleTabPress(editor);
      } else if (event.ctrlKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        this.openWordCountPrompt(editor);
      }
    });
  }

  getLineCount(editorElement: HTMLDivElement): number {
    const text = editorElement.innerText || '';
    const lines = text.split(/\r?\n/);
    return lines.length;
  }

  createNewEditorBox() {
    const pageNumber =
      this.editorContainer.nativeElement.querySelectorAll('.editor').length + 1;
    this.insertPageNumber(pageNumber);

    const newEditor = this.renderer.createElement('div');
    this.renderer.addClass(newEditor, 'editor');
    this.renderer.setAttribute(newEditor, 'contenteditable', 'true');

    this.setEditorHeight(newEditor);
    this.renderer.appendChild(this.editorContainer.nativeElement, newEditor);

    setTimeout(() => {
      newEditor.focus();
    }, 0);

    this.monitorEditor(newEditor);
  }

  insertPageNumber(pageNumber: number) {
    const pageNumberElement = this.renderer.createElement('div');
    this.renderer.addClass(pageNumberElement, 'page-number');
    const text = this.renderer.createText(`-- ${pageNumber} --`);
    this.renderer.appendChild(pageNumberElement, text);

    this.renderer.appendChild(this.editorContainer.nativeElement, pageNumberElement);
  }

  insertPageNumberAtStart() {
    const pageNumberElement = this.renderer.createElement('div');
    this.renderer.addClass(pageNumberElement, 'page-number');
    const text = this.renderer.createText('-- 1 --');
    this.renderer.appendChild(pageNumberElement, text);

    const firstEditor = this.editor.nativeElement;
    this.renderer.insertBefore(
      this.editorContainer.nativeElement,
      pageNumberElement,
      firstEditor
    );
  }

  // Method to get the combined content of all editors (used for saving)
  getEditorContent(): string {
    const editors = this.editorContainer.nativeElement.querySelectorAll('.editor');
    let content = '';
    editors.forEach((editor: Element) => {
      // Use innerText to preserve line breaks
      const editorText = (editor as HTMLDivElement).innerText;
      content += editorText.trim() + '\n\n'; // Separate editors with double newlines
    });
    return content.trim();
  }
}