"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Spinner } from "../components/Spinner";

export default function Lerit() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsTyping(true);

    // Add the user's message to the messages array
    const newMessage = { role: "user", content: input };
    const updatedMessages = [...messages, newMessage]; // Create a new array with the user's message
    setMessages(updatedMessages); // Update the state

    try {
      // Send the updated messages array to the API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }), // Use the updatedMessages array
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response from the server.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      const assistantMessage = { role: "assistant", content: "" }; // Initialize assistant message

      // Add a placeholder assistant message to the messages array
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);

      // Stream the response from the API
      while (!done) {
        const { value, done: readerDone } = await reader!.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        assistantMessage.content += chunk;

        // Update the assistant message in the messages array
        setMessages((prevMessages) => [
          ...prevMessages.slice(0, -1),
          { ...assistantMessage },
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
      // Add an error message from the assistant
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
      setInput("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Lerit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 h-96 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isTyping}
          />
          <Button type="submit" disabled={isTyping}>
            {isTyping ? <Spinner /> : "Send"}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
