import { Component, ViewChild } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { StoryEditorComponent } from './story-editor/story-editor.component';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [StoryEditorComponent, NgIf, CommonModule, HttpClientModule, FormsModule],
})


export class AppComponent {
  menuOpen = false;
  drawerOpen = false;
  showHelpPopup = false;
  accessCode: string = '';
  errorMessage: string = '';

  title: string = '';
  protagonist: string = '';
  outline: string = '';
  // Properties for drawer inputs
  // title: string = "What's the title of your story";
  // protagonist: string = 'Kit, the heiress of Castle Quitzoebel';
  // outline: string = 'Kit discovers a hidden wine cellar with magic wine bottles that open portals to other worlds.';

  @ViewChild('storyEditor', { static: true })  storyEditorComponent!: StoryEditorComponent;

  // Utility functions for handling cookies
  setCookie(name: string, value: string, days: number) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  }

  getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  closeModal() {
    this.showHelpPopup = false;
  }
  
  ngOnInit() {
    this.loadFromLocalStorage();
    this.checkIfHelpShown();
  }

  constructor(private http: HttpClient) {}

   // Check if the user already entered the access code successfully
  checkIfAccessGranted() {
    const accessGranted = this.getCookie('accessGranted');
    if (!accessGranted) {
      this.showHelpPopup = true;
    }
  }

  // Submit the access code to the server for verification
  async submitAccessCode() {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean }>('/api/verify-access-code', {
          accessCode: this.accessCode,
        })
      );

      if (response.success) {
        this.setCookie('accessGranted', 'true', 30); // Store success for 30 days
        this.showHelpPopup = false; // Close the popup
      } else {
        this.errorMessage = 'Invalid access code. Please try again.';
      }
    } catch (error) {
      this.errorMessage = 'Error verifying access code. Please try again.';
    }
  }

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
  }

  // Check if the help popup was already shown using cookies
  checkIfHelpShown() {
    const helpShown = this.getCookie('helpShown');
    if (!helpShown) {
      this.showHelpPopup = true; // Show the help popup if it hasn't been shown
      this.setCookie('helpShown', 'true', 30); // Set the cookie to expire in 30 days
    }
  }

  openHelpPopup() {
    this.showHelpPopup = true;
  }

  closeHelpPopup() {
    this.showHelpPopup = false;
  }

  loadFromLocalStorage() {
    const savedTitle = localStorage.getItem('storyTitle');
    const savedProtagonist = localStorage.getItem('storyProtagonist');
    const savedOutline = localStorage.getItem('storyOutline');

    this.title = savedTitle ? savedTitle : "The Grail Knight's Tale";
    this.protagonist = savedProtagonist ? savedProtagonist : 'Sir Cedric is a valiant knight, distinguished by his unwavering honor and deep faith. Draped in worn armor, he is a beacon of resilience, navigating through treacherous medieval landscapes with a steadfast heart';
    this.outline = savedOutline ? savedOutline : 'In the heart of the Dark Ages, a lone knight named Sir Cedric embarks on a perilous quest to find the fabled Holy Grail. Guided by whispers of prophecy and faith, he ventures through plague-ridden villages, cursed forests, and desolate castles. Along the way, he faces vengeful spirits, treacherous lords, and ancient riddles that test his courage and virtue. Haunted by visions of the Grail’s power, Sir Cedric must navigate a world where loyalty is scarce, and hope is fragile. His journey promises redemption for a kingdom on the brink of ruin—or his own downfall.';
  }

  saveToLocalStorage() {
    localStorage.setItem('storyTitle', this.title);
    localStorage.setItem('storyProtagonist', this.protagonist);
    localStorage.setItem('storyOutline', this.outline);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  async saveFile() {
    // Get the content from the editor component
    const content = this.storyEditorComponent.getEditorContent();

    try {
      // Create a new file handle
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: 'novel.txt',
        types: [
          {
            description: 'Text Files',
            accept: { 'text/plain': ['.txt'] },
          },
        ],
      });

      // Create a writable stream
      const writable = await fileHandle.createWritable();

      // Write the content to the file
      await writable.write(content);

      // Close the file and write the contents to disk
      await writable.close();

      this.menuOpen = false;
    } catch (error) {
      console.error('Save operation cancelled or failed:', error);
    }
  }

  async openFile() {
    try {
      // Open the file picker
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Text Files',
            accept: { 'text/plain': ['.txt'] },
          },
        ],
        excludeAcceptAllOption: true,
        multiple: false,
      });

      // Get the file
      const file = await fileHandle.getFile();

      // Read the file content
      const text = await file.text();

      // Load the content into the editor
      this.storyEditorComponent.loadTextIntoEditors(text);

      this.menuOpen = false;
    } catch (error) {
      console.error('Open operation cancelled or failed:', error);
    }
  }
}