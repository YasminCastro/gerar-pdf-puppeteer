const express = require("express");
const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");
const fs = require("fs");

const app = express();

app.use(express.json());

const validaCPF = require("./utils/validaCPF");

const passengers = [
  {
    name: "Yas",
    flightNumber: 7859,
    time: "18h00",
  },
  {
    name: "Maria",
    flightNumber: 7859,
    time: "18h00",
  },
  {
    name: "Eve",
    flightNumber: 7859,
    time: "18h00",
  },
  {
    name: "Arthur",
    flightNumber: 7859,
    time: "20h00",
  },
];

app.get("/pdf", async (request, response) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--window-size=1920,1080"],
  });

  try {
    const page = await browser.newPage();

    console.log("Abrindo página http://localhost:3000...");
    await page.goto("http://localhost:3000", {
      waitUntil: "networkidle0",
    });

    console.log("Gerando PDF da página...");
    const pdf = await page.pdf({
      path: "public/pdf.pdf",
      printBackground: true,
      format: "Letter",
    });

    response.contentType("application/pdf");

    return response.send(pdf);
    // return response.json({ pdf: pdf });
  } catch (err) {
    if (err.message.includes("ENOENT: no such file or directory")) {
      console.log("Criando pasta public");
      fs.mkdirSync("./public");
    } else {
      console.log(err.message);
    }
    // ler erro, se o erro for  no such file or directory...cria a pasta 'public'
    // se não for esse o erro, dá um console.log no erro...
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.get("/", (request, response) => {
  const filePath = path.join(__dirname, "print.ejs");
  ejs.renderFile(filePath, { passengers }, (err, html) => {
    if (err) {
      return response.send("Erro na leitura do arquivo");
    }

    // enviar para o navegador
    return response.send(html);
  });
});

app.post("/relatorio", async (request, response) => {
  const { dominio, cpf, usuario, senha } = request.body;

  const parsedDominio = dominio.toUpperCase();

  if (parsedDominio.length !== 3) {
    return response
      .status(400)
      .json({ message: "O dominio deve ter três letras" });
  }

  console.log("CPF é valido?", validaCPF(cpf));

  if (!validaCPF(cpf)) {
    return response.status(400).json({ message: "CPF invalido" });
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--window-size=1920,1080"],
  });

  try {
    const page = await browser.newPage();
    console.log("Abrindo página https://sistema.ssw.inf.br/bin/ssw0422...");
    await page.goto("https://sistema.ssw.inf.br/bin/ssw0422", {
      waitUntil: "networkidle0",
    });

    const DOMINIO_INPUT = "input[id='1']";
    const CPF_INPUT = "input[id='2']";
    const USUARIO_INPUT = "input[id='3']";
    const SENHA_INPUT = "input[id='4']";
    const ENTER_BUTTON = "a[id='5'].imglnk";

    console.log(`Preenchendo Domínio ${parsedDominio}...`);
    await page.type(DOMINIO_INPUT, parsedDominio);

    console.log(`Preenchendo CPF ${cpf}...`);
    await page.type(CPF_INPUT, cpf);

    console.log(`Preenchendo Usuário ${usuario}...`);
    await page.type(USUARIO_INPUT, usuario);

    console.log(`Preenchendo Senha ${senha}... `);
    await page.type(SENHA_INPUT, senha);

    console.log(`Apertando botão enter...`);
    await page.click(ENTER_BUTTON);

    console.log("<DEBUG> Esperando por 50s...");
    await page.waitForTimeout(50000);

    return response.status(200).json({ message: "Logado com sucesso!" });
  } catch (error) {
    console.log(error);
  } finally {
    if (browser) {
      console.log("Fechando o navegador...");
      await browser.close();
    }
  }
});

app.listen(3000);
