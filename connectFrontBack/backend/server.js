import express from "express"

const app = express()

app.get('/',(req,res)=>{
    res.send("server is ready");
})

app.get('/api/jokes',(req,res)=>{
    const jokes = [
        {
          id: 1,
          setup: "Why don't scientists trust atoms?",
          punchline: "Because they make up everything!"
        },
        {
          id: 2,
          setup: "Why did the scarecrow win an award?",
          punchline: "Because he was outstanding in his field!"
        },
        {
          id: 3,
          setup: "What do you get when you cross a snowman and a vampire?",
          punchline: "Frostbite."
        },
        {
          id: 4,
          setup: "Why don't skeletons fight each other?",
          punchline: "They don't have the guts."
        },
        {
          id: 5,
          setup: "What do you call fake spaghetti?",
          punchline: "An impasta."
        },
        {
          id: 6,
          setup: "Why was the math book sad?",
          punchline: "Because it had too many problems."
        },
        {
          id: 7,
          setup: "Why couldn't the bicycle stand up by itself?",
          punchline: "It was two-tired."
        },
        {
          id: 8,
          setup: "What do you call cheese that isn't yours?",
          punchline: "Nacho cheese."
        },
        {
          id: 9,
          setup: "How does a penguin build its house?",
          punchline: "Igloos it together."
        },
        {
          id: 10,
          setup: "What do you call a belt made of watches?",
          punchline: "A waist of time."
        }
      ];
    res.send(jokes)
})

const port = process.env.PORT || 3000;

app.listen(port,()=>{
    console.log(`server at http://localhost:${port}`);
})