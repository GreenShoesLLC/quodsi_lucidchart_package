import {
    EditorClient,Modal
} from 'lucid-extension-sdk';


export class HelloWorldModal extends Modal {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Hello world',
            width: 400,
            height: 300,
            content: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #333;">Lucid Styled Elements</h2>
                    <p>Here are some Lucid-styled buttons and an input field:</p>
                    <button class="lucid-styling primary" style="margin-right: 10px;">Primary</button>
                    <button class="lucid-styling secondary" style="margin-right: 10px;">Secondary</button>
                    <button class="lucid-styling tertiary">Tertiary</button>
                    <p>Input field:</p>
                    <input type="text" class="lucid-styling" placeholder="Enter text here">
                </div>
            `,
        });
    }
}