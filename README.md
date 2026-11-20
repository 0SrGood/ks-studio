# Studio Karyna Santos

PWA em português brasileiro para o Studio Karyna Santos, em João Câmara, RN. Este repositório público contém o frontend React, TypeScript e Vite e o fluxo do GitHub Pages.

## Prévia local

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
node scripts/verify-build.mjs
```

A prévia pública funciona antes da conexão com o Supabase. Catálogo, agenda e áreas privadas ficam disponíveis à medida que o backend e os dados reais do Studio são configurados.

- `/#/` abre o aplicativo de agendamento, histórico e pagamentos.
- `/studio.html#/` abre a apresentação pública com biografia, portfólio, cursos e contato. Este é o endereço para a bio do Instagram.
- `/#/admin` abre a área autenticada da proprietária, com agenda, clientes, pagamentos e resultado mensal.

## GitHub Pages

O workflow publica a pasta `dist` a partir de `main`. Configure o GitHub Actions como fonte no Pages. Para conectar o frontend, defina as variáveis de repositório `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Use `VITE_GOOGLE_SIGN_IN=true` após habilitar Google no Supabase Auth. Use `VITE_PUSH_PUBLIC_KEY` somente quando houver serviço de entrega ativo. O frontend usa rotas com hash, inclusive na subpasta do Pages.

## Conteúdo

Imagens de clientes dependem de consentimento e são publicadas pela administração. A galeria consulta o backend para carregar as fotos autorizadas. Sem configuração de avaliações, os links levam ao Google Maps. Os links oficiais do Instagram abrem no Instagram.

Os módulos do banco, das funções e do processamento de comprovantes ficam no workspace privado da manutenção do Studio. Segredos, documentos e dados de clientes ficam fora deste repositório.

