
<div align="center">

![plexus.png](src-tauri/icons/plexus.png)

</div>

# Plexus IDE

Plexus IDE is a modern, feature-rich code editor designed to provide a seamless coding experience for developers. With support for multiple programming languages, tabs for easy navigation, and built-in file management, Plexus IDE is built for both beginners and professionals alike.

## Features

- **Multi-tab support**: Work on multiple files at the same time with tabs for each file.
- **Auto-save**: Keep your work safe with automatic saving functionality.
- **Language support**: Supports a variety of programming languages including JavaScript, Python, TypeScript, Java, C++, HTML, CSS, Rust, and Go.
- **File management**: Easily open, save, and create new files, with a simple interface for selecting languages and file formats.
- **Integrated Monaco Editor**: Enjoy a powerful code editor experience with Monaco Editor, offering features like syntax highlighting, IntelliSense, and more.
- **Terminal integration**: Toggle a terminal window within the IDE (coming soon).

## Supported Languages

Plexus IDE supports the following languages:

- JavaScript
- Python
- Java
- C++
- TypeScript
- HTML
- CSS
- Rust
- Go

## Installation

To get started with Plexus IDE, follow these steps:

### Prerequisites

- **Node.js**: Make sure you have Node.js installed.
- **Tauri**: Plexus IDE uses Tauri for building a desktop app. Follow the Tauri installation guide [here](https://tauri.app/docs/getting-started/intro) to get started with Tauri.

### Clone the Repository

```bash
git clone https://github.com/hacimertgokhan/plexus.git
cd plexus
```

### Install Dependencies

```bash
npm install
```

### Run the Application

```bash
npm run dev
```

Plexus IDE will open in your default browser (or as a desktop app if using Tauri).

## Usage

1. **Create a New File**: Go to the **File** menu and select **New File** to create a new file. Choose the programming language you'd like to use.
2. **Edit Code**: Start typing your code in the editor. Plexus IDE supports syntax highlighting and auto-completion for various languages.
3. **Save File**: Click on **File > Save** or use the shortcut `Cmd/Ctrl + S` to save your work.
4. **Tabs**: Easily switch between open files using the tab bar at the top of the editor.
5. **Terminal (Coming Soon)**: Toggle a terminal window within the IDE to execute commands.

## Contributing

We welcome contributions to Plexus IDE! If you'd like to contribute, follow these steps:

1. Fork this repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Commit your changes (`git commit -am 'Add new feature'`)
5. Push to the branch (`git push origin feature/your-feature`)
6. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- **Monaco Editor** for providing an excellent code editor experience.
- **Tauri** for enabling the creation of cross-platform desktop apps.

---

Feel free to customize this further to fit your project better. If you'd like to add more specifics (like installation steps for the desktop version using Tauri, etc.), let me know!