# XLR8 Parla Extension

**XLR8 Parla** is a Google Chrome extension designed to enhance language learning through direct interaction with multimedia and web content.  
It allows users to select text from subtitles on **YouTube** or **Netflix**, as well as from general web pages or PDFs, providing instant translation, saving options, and practice tools integrated with a complementary **WebApp**.

---

## Purpose

The goal of this extension is to create an immersive learning environment where users can capture meaningful phrases from the content they consume, store them, and reinforce their learning through interactive exercises and progress tracking.

---

## Key Features

- Detect text selection from subtitles (YouTube / Netflix) and general web pages.  
- Display a **floating popup** with options to translate or save phrases.  
- Sync saved phrases with the **Parla WebApp** backend (Django).  
- Play pronunciations and track learning statistics.  
- Practice through **flashcards** or **interactive mini-games**.  
- Integrate authentication with Google accounts.

---

## Project Architecture

```plaintext
XLR8-parla-extension/
│
├── manifest.json               
├── README.md                    # Project documentation
│

│   ├── /popup                   # Popup UI components
│   ├── /background              # Service logic (auth, events, messaging)
│   ├── /utils                   # Reusable helper functions
│   ├── /assets                  # Icons and images
│   └── /styles                  # Shared CSS files
│
