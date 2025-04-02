import {db} from "./db/index.js";
import {todosTable} from "./db/schema.js";
import {ilike} from 'drizzle-orm';
import OpenAI from "openai";
import  readlinkSync from "readline-sync";

const client = new OpenAI();

//function to perform all CRUD operations
async function getAllTodos() {
    const todos = await db.select().from(todosTable);
    return todos; 
}

//function to create a ToDo
async function createTodo(tos) {
    const [result] = await db.insert(todosTable).values({
        todo,
    }).returning({
        id: todosTable.id
    });
    return result.id;
}

//function to delete ToDo
async function deleteTodo(id) {
    await db.delete(todosTable). where(eq(todosTable.id, id));
}

//function to search ToDo
async function searchTodo(search) {
    const todos = db.select().from(todosTable).where(ilike(todosTable.todo, `%${search}%`));
    return todos;
}

const tools = {  
    getAllTodos: getAllTodos,
    createTodo: createTodo,
    deleteTodoById: deleteTodo,
    searchTodo: searchTodo,
};

const SYSTEM_PROMPT = `
You are an AI To-Do List Assistant with START, PLAN, ACTION, Observation and OutputState.
Wait for the user prompt and first PLAN using available tools.
After lanning, take the action with appropriate tools and wait for observation based on Action.
Once youget the observation, Return the AI response based on START prompt observations.

You can manage tasks by adding, viewing, updating, and deleting them. 
You must strictly follow the JSON output format.

Todo DB Schema:
id: Int and Primary Key
todo: String
created_at: Date Time
updated_at: Date Time

Available Tools:
    - getAllTodos(): Returns all the Todos from the Database
    - createTodo(todo: string): Creates a new Todo in the DB and takes Todo as a string and returns the ID of created Todo
    - deleteTodoById(id: string): Deletes the Todo by ID given in the DB
    - searchTodo(query: string): Searches for all Todos matching the query string using ilike operater

Example:
START
{"type": "user", "user": "Add a task for shopping groceries."}
{"type": "plan", "plan": "I will try to get more context on what user needs to shop."}
{"type": "output", "output": "Can you tell me what all items you want to shop for?"}
{"type": "user", "user": "I want to shop for milk, bread, and sugar."}
{"type": "action", "function": "createTodo", "input": "Shopping for milk, bread, and sugar."}
{"type": "observation", "obervation": "2"}
{"type": "output", "output": "Your Todo has been added successfully!"}
`;

const messages = [{ 
    role: 'system', 
    content: SYSTEM_PROMPT 
}];

while (true) {
    const query  = readlinkSync.question('>> ');
    const userMessage = {
        type: 'user',
        user: query,
    };
    messages.push({ 
        role: 'user', 
        content: JSON.stringify(userMessage)
    });

    while (true) {
        const chat = await client.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            response_format: { type: 'json_object' },
        });
        const result = chat.choices[0].message.content;
        messages.push({ 
            role: 'assistant', 
            content: result 
        });

        console.log(`\n\n-----------------START AI-----------------`);
        console.log(result);
        console.log(`-----------------END AI-----------------\n\n`);

        const action = JSON.parse(result);

        if (action.type === 'output') {
            console.log(`: ${action.output}`);
            break;
        }
        else if (action.type === 'action') {
            const fn = tools[action.function];
            if (!fn) throw new Error('Invalid Tool Call');
            const observation = await fn(action.input);

            const obervationMessage = {
                type: 'observation',
                observation: observation,
            };
            messages.push({ 
                role: 'developer', 
                content: JSON.stringify(observationMessage) 
            });
        }
    }        
}
