---
date: '2026-04-21T18:13:16Z'
title: 'Simple Secret Manager - or Rust vs Go'
tags:
- computer
- apps
- programming
---

## Simple secret manager

Over the first two or three weeks of my parental leave, I decided to work on a toy project. Here it is: https://github.com/ankel/simple-secret-manager

In short, the goal of this project is to create an encrypted tarball storing loose secret files. If you manage your home lab with a few dozen passwords, API keys, tokens, this could be of use to you!

## Rust vs Go

There are two implementations of SSM in that repo, one in Rust and one in Golang. I've been spending the last few years working with Go, so that part is perhaps obvious, and as for Rust, well I just wanted to learn a new language. So how was it?

Let's start with some observations:

### Line of code vs binary size

Number wise, both languages clock around two thousand line of code for the whole project. For both languages, I try to stick to the standard library whenever possible (impossible for rust, as you'll see below), and otherwise sticking to the popular dependencies.

On the other hand, the Rust binary is much smaller. The Go code compiled to 4-5 MB whereas the Rust binary was only around 2.5MB. This is with the Go binary already stripped of debug symbols (`-ldflags "-s -w"`). If I have to make a guess, I'd say the extra size came from the garbage collector? Go's limited and obscure flag system definitely doesn't help with understanding what's going on, as opposed to Rust's well-documented [release profiles](https://doc.rust-lang.org/cargo/reference/profiles.html)

### Standard library

The concept of a "standard" library is quite different between the two languages. Go takes a "batteries-included" approach, providing built-in packages for common needs like JSON serialization, hashing, encryption, gzip, and tar. Rust, conversely, ships with a very slim standard library. All those aforementioned features require pulling in third-party "crates" (Rust's term for dependencies). The developer experience in Rust is that you spend more time hunting for the right crate and managing dependencies before you can actually start building, even for a security focus project where I try not to rely too much on non-standard stuff. I quickly realized this is not a very realistic goal with Rust 😃 

However, there is a flip side to this ecosystem difference. While Go's standard library is comprehensive, its APIs are often quite low-level. It gives you the primitives, but you usually have to wire them together yourself. Take extracting a tarball as an example. In Go, I had to manually read the tar header, iterate through it file by file, programmatically recreate the directory structure and extract the file. In Rust, using the popular `tar` crate, that entire operation is abstracted behind a single function call. 

### Error handling

I'll say it: I much prefer Rust's approach to error handling!

In Go, errors tend to congeal around a "stringly" typed interface - an `Error()` function returning a string. While you **can** define and handle specific error types, few **do**. Take Go's internal `net` package: it defines specific errors (like DNS vs. transport), yet functions still return the generic `error` interface. Differentiating between "is the cable unplugged?" and "can't resolve the domain" requires an ugly, inefficient chain of `if errors.Is(err, typeA) else if...` checks.

Then there is the ubiquitous `if err != nil { return err }` pattern. It suffers from two major flaws. First, it is so verbose that your brain is trained to ignore it, creating a perfect hiding spot for bugs. You might accidentally write a complex condition like `if foo.bar().baz != 42 && err == nil`, or worse, forget to check the error entirely. Go's compiler won't stop you; it just becomes a runtime bug. Oh, and did you notice a bug in the line above?

Second, simply returning `err` up the call stack is sloppy. It strips away the context of where the error originated. In a microservice architecture, dealing with a vague network error in the log without the context of **which** service failed is a nightmare. 

Rust solves this elegantly. You can define your own error types using Enums, each carrying specific context (like an HTTP code or IO timeout). The caller is forced by the compiler to handle them, and using Rust's pattern-matching makes routing those specific errors highly readable:

```rust
match fetch_data() {
    Ok(data) => process(data),
    Err(NetError::DnsUnresolved(domain)) => println!("Cannot resolve: {}", domain),
    Err(NetError::Timeout(duration)) => println!("Timed out after: {:?}", duration),
    Err(NetError::Disconnected) => println!("Cable unplugged!"),
}
```

While it's still possible to propagate the underlying errors ie. `io.Error` in application code, it's hard to skip over the other option when it is this good!

And if you really really don't care about your errors, there's [anyhow](https://crates.io/crates/anyhow).

### Memory Security

When building a secret manager, how the language handles memory is a critical security vector. Rust’s deterministic memory management really shines here. Because Rust lacks a garbage collector, a heap-allocated variable only lives as long as it remains in scope. Once it goes out of scope, the variable is immediately "dropped" (Rust's term for freed).  You can rely on the compiler to handle this automatically, or you can implement a custom `Drop` trait for specific teardown behavior. 

Oh, and this scope is strictly checked by the compiler - this is the infamous borrow checker! At compile time, the compiler can tell who is owning the variable, and whether it's still in scope or not. It can deterministically tell that when the `drop` function is called, no one else is using that variable. Here's an example where this is valuable:

In my SSM implementation, I used Rust's version of the `age` cryptography crate. It includes a specific "secret string" type designed for storing passwords. One aspect of this type that - using these strict rules - it can securely zeroes out the string in memory before freeing (`drop`ing) it, ensuring the plaintext password doesn't linger in RAM longer than it needs to. This is possible because Rust compiler forces every function to agree on who owns the data:

* **Consuming (Moving)**: If a Rust `decrypt(key: SecretString)` function takes ownership of the password, its scope "moves" into that function. You, as the caller, can no longer use it. It will be securely dropped and zeroed the moment the decrypt function finishes.

* **Borrowing (Referencing)**: If the function signature is `decrypt(key: &SecretString)`, you know for a fact it is only borrowing the password. The compiler guarantees that the decrypt function cannot mutate it, cannot drop it, and cannot hold onto that reference longer than the variable's lifetime in your calling function. If `SecretString` doesn't implement `Clone` then they may not even make a copy of the string internally - at least not easily 😊

In Go, the situation is completely different. Because of the garbage collector, there is no guaranteed or deterministic lifetime for a variable. Even if the programmer may want to zero it out, they don't know how many code are still referring to that string; there's no "moving vs referencing" sematic like Rust above. 

Admittedly I don't know enough about the Go GC, however with Java's GC - specifically the G1 collector - there's another problem: Live objects may get copied around several times during the compaction phase. This means even if you read all the code in your entire dependency tree, it's **still** not possible to reason about how many copies of the password are there in memory.

## Final thoughts

After reimplementing the same project in two different language, my opinion is that I really don't have an opinion 😳. I like what I've seen in Rust, and it made me want to try Rust out more - especially the elegant error handling and the strict guarantees around memory security.

But if I have to pick one language to hit the market first, Go is clearly the right choice. The rapid development cycle provided by its comprehensive standard library and hand-off garbage collector is hard to beat for getting a working prototype out the door quickly.
