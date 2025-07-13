# 🤖 Echo AI: Fast & Lightweight Model Training Platform

Echo AI is a user-friendly, open source platform for building and training intelligent AI bots. Designed with simplicity and modularity in mind, Echo AI enables developers, educators, and hobbyists to create lightweight AI-based projects such as chat bots, image classifiers, and intent detectors with ease.

## 🔑 Key Features
  - 🎯 Conversational Bot Builder
    - Easily upload image patterns to create training datasets for various object categories
    - Define custom responses based on image recognition
  - 🎯 Image-based Classifier Training
    - Train bots to respond to text input using pattern matching
    - Add static or dynamic scripted responses
  - 🎯 Project Management
    - Save your AI training projects and revisit them for updates
    - Create multiple categories and manage training inputs and responses effortlessly
  - 🎯 Flexible Output Formats
    - Choose between static, random, or JSON-formatted responses
    - Integrate with other applications via structured outputs
  - 🎯 Code Injection
    - Use scripting to dynamically inject logic for responses

## 🛠️ Setup Instructions

Install Node modules

```
npm install
```

Start project

```
npm start
```

Development interface will be opened in your web browser

## 🌟 Usage and Features

### 1. Create Project

You can create a project using one of the classification types from.
- `Text Classification` - User input will be a text and predication will be using text as patterns.
- `Image Classification` - User input will be a text and predication will be using image as patterns.

### 2. Clean or Delete Projects

You can manage your projects when select them and from the options appear in details panel.
- `Clean Project` - Chat history (predications) will be deleted along with any upload cache.
- `Delete Project` - Project will be deleted permanently.

### 3. Project Editor Interface

You can open a project by double clicking on listing item or clicking the `Open in Editor` button.
- Empty project will display to create your first data input.
- Then there wil be three main sections in the editor interface.
  - `Inputs Listing` - Add, select or delete data inputs in the project.
  - `Input Editor` - Edit selected input.
  - `Run Predictions` - Chat with the trained AI and test the responses.

### 4. Training Data Inputs

Each one of data input is a one classification that the model will select from prediction.
Model will calculate the possibility score for each input and take the most scored input as the response.
- `Patterns` - Patterns are the identification data for the training. 
- `Response` - Static, Radom or any required output should be returned.
- `Scripting` - Inject or manipulate response before display to the user.

### 5. Run Predications

This sections is where you can test the trained model by sending text / image inputs.

### Developed by Deshan Nawanjana

[Deshan.lk](https://deshan.lk/)
&ensp;|&ensp;
[DNJS](https://dnjs.lk/)
&ensp;|&ensp;
[LinkedIn](https://www.linkedin.com/in/deshan-nawanjana/)
&ensp;|&ensp;
[GitHub](https://github.com/deshan-nawanjana)
&ensp;|&ensp;
[YouTube](https://www.youtube.com/@deshan-nawanjana)
&ensp;|&ensp;
[Blogger](https://dn-w.blogspot.com/)
&ensp;|&ensp;
[Facebook](https://www.fb.com/mr.dnjs)
