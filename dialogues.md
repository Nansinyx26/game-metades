# Guia de Diálogos — Two To One

Este documento lista todas as falas implementadas para os personagens Luxar e Tenebre, organizadas por gatilho e momento do jogo.

## 1. Falas de Início de Nível (Lore)

| Momento | Personagem | Fala |
| :--- | :--- | :--- |
| **Nível 0 (Início)** | Luxar | "Onde... onde estamos?" |
| **Nível 0 (Início)** | Tenebre | "Sinto que não estamos sós." |
| **Nível 5** | Luxar | "O abismo parece mais profundo hoje." |

## 2. Transições de Ato (Eventos Únicos)

| Ato | Personagem | Fala |
| :--- | :--- | :--- |
| **Início do Ato 2** | Tenebre | "A escuridão aqui é... pesada." |
| **Início do Ato 2** | Luxar | "Eu serei sua bússola." |
| **Início do Ato 3** | Luxar | "O fim está próximo, sinto o calor." |
| **Início do Ato 3** | Tenebre | "Juntos até a última centelha." |

## 3. Clímax e Final

| Momento | Personagem | Fala |
| :--- | :--- | :--- |
| **Fase Final** | Luxar | "É hora de voltarmos a ser um." |
| **Fase Final** | Tenebre | "Finalmente... a Unidade." |

## 4. Interações Dinâmicas (Gatilhos)

### Ativação de Cristais (Luxar)
Sempre que Luxar toca um cristal de energia, ele escolhe uma das frases abaixo aleatoriamente:
- *"Sinto o fluxo voltando..."*
- *"A energia... ela pulsa."*
- *"Um fragmento da unidade."*
- *"Luz em meio ao vazio."*

---

**Nota Técnica:** Todas as falas são disparadas via código através do método `player.say(texto, duracao)`, permitindo fácil expansão para novos eventos e puzzles.
