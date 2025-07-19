require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Configuration Express pour Render
const app = express();
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

const listener = app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

// Configuration Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ID du propriétaire
const OWNER_ID = process.env.OWNER_ID || 'TON_USER_ID_ICI';

// Fichiers de base de données
const SHOPS_FILE = 'shops.json';
const ACCOUNTS_FILE = 'accounts.json';
const CART_FILE = 'cart.json';
const SHOP_MESSAGES_FILE = 'shopMessages.json';
const STOCK_MESSAGES_FILE = 'stockMessages.json';

// Map pour stocker les timeouts des interactions
const interactionTimeouts = new Map();

// Utilitaires de fichiers
function loadData(filename) {
  try {
    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, '{}');
    }
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data || '{}');
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return {};
  }
}

function saveData(filename, data) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving ${filename}:`, error);
  }
}

// Commandes slash
const commands = [
  new SlashCommandBuilder()
    .setName('createshop')
    .setDescription('Create a shop')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Shop image URL')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('deleteshop')
    .setDescription('Delete a shop')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Shop name')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('shoplist')
    .setDescription('List all shops'),

  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Display a shop')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Shop name')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Add an item to a shop')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Item name')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('Item price')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Stock quantity')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Item image URL')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('addaccount')
    .setDescription('Add an account to a shop')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Account name')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('Account price')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Stock quantity')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Account description')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('image1')
        .setDescription('Inventory image 1 (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image2')
        .setDescription('Inventory image 2 (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image3')
        .setDescription('Inventory image 3 (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image4')
        .setDescription('Inventory image 4 (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image5')
        .setDescription('Inventory image 5 (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image6')
        .setDescription('Inventory image 6 (optional)')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('edititem')
    .setDescription('Edit an item')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Item name')
        .setRequired(true))
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('New price')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('New quantity')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('New image')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('removeitem')
    .setDescription('Remove an item')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Item name')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('deleteitem')
    .setDescription('Remove an item (alias)')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Item name')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('removeaccount')
    .setDescription('Remove an account')
    .addStringOption(option =>
      option.setName('shop')
        .setDescription('Shop name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Account name')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('itemstock')
    .setDescription('View stock overview'),

  new SlashCommandBuilder()
    .setName('cart')
    .setDescription('Manage your cart'),

  new SlashCommandBuilder()
    .setName('setglobalimage')
    .setDescription('Set a global image for all shops')
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Global image URL')
        .setRequired(true))
];

// Vérification des permissions
function isOwner(userId) {
  return userId === OWNER_ID;
}

// Génération des embeds
function generateShopEmbed(shopName, shopData) {
  const embed = new EmbedBuilder()
    .setTitle(`🛍️ **${shopName.toUpperCase()}**`)
    .setColor(0x00AE86);

  const shops = loadData(SHOPS_FILE);
  const globalImage = shops.globalImage;

  if (shopData.image) {
    embed.setImage(shopData.image);
    embed.setThumbnail(shopData.image);
  } else if (globalImage) {
    embed.setImage(globalImage);
    embed.setThumbnail(globalImage);
  }

  // Articles disponibles (stock > 0) - 4 par ligne
  const availableItems = Object.entries(shopData.items || {})
    .filter(([_, item]) => item.quantity > 0);

  if (availableItems.length > 0) {
    for (let i = 0; i < availableItems.length; i += 4) {
      const chunk = availableItems.slice(i, i + 4);
      chunk.forEach(([name, item]) => {
        embed.addFields({
          name: `📦 ${name}`,
          value: `Price: $${item.price.toFixed(2)}\nStock: ${item.quantity}`,
          inline: true
        });
      });
    }
  } else {
    embed.addFields({ name: 'Available Items', value: 'No items in stock', inline: false });
  }

  // Ajouter les comptes disponibles
  const accounts = loadData(ACCOUNTS_FILE);
  const shopAccounts = accounts[shopName] || {};
  const availableAccounts = Object.entries(shopAccounts)
    .filter(([_, account]) => account.quantity > 0);

  if (availableAccounts.length > 0) {
    for (let i = 0; i < availableAccounts.length; i += 4) {
      const chunk = availableAccounts.slice(i, i + 4);
      chunk.forEach(([name, account]) => {
        embed.addFields({
          name: `🏦 ${name}`,
          value: `Price: $${account.price.toFixed(2)}\nStock: ${account.quantity}`,
          inline: true
        });
      });
    }
  }

  embed.setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });
  return embed;
}

function generateSelectMenu(shopName, shopData) {
  const options = [];
  
  for (const [itemName, item] of Object.entries(shopData.items || {})) {
    const isOutOfStock = item.quantity <= 0;
    options.push({
      label: isOutOfStock ? `${itemName} (Out of Stock)` : itemName,
      description: `Price: $${item.price.toFixed(2)} | Stock: ${item.quantity}`,
      value: `item:${shopName}:${itemName}`,
      emoji: isOutOfStock ? '❌' : '📦'
    });
  }

  if (options.length === 0) {
    options.push({
      label: 'No items available',
      description: 'This shop has no items',
      value: 'no_items',
      emoji: '🚫'
    });
  }

  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_item')
        .setPlaceholder('Select an item to view details')
        .addOptions(options.slice(0, 25))
    );
}

function generateAccountSelectMenu(shopName) {
  const accounts = loadData(ACCOUNTS_FILE);
  const shopAccounts = accounts[shopName] || {};
  const options = [];
  
  for (const [accountName, account] of Object.entries(shopAccounts)) {
    const isOutOfStock = account.quantity <= 0;
    options.push({
      label: isOutOfStock ? `${accountName} (Out of Stock)` : accountName,
      description: `Price: $${account.price.toFixed(2)} | Stock: ${account.quantity}`,
      value: `account:${shopName}:${accountName}`,
      emoji: isOutOfStock ? '❌' : '🏦'
    });
  }

  if (options.length === 0) {
    options.push({
      label: 'No accounts available',
      description: 'This shop has no accounts',
      value: 'no_accounts',
      emoji: '🚫'
    });
  }

  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_account')
        .setPlaceholder('Select an account to view details')
        .addOptions(options.slice(0, 25))
    );
}

function generateItemEmbed(shopName, itemName, itemData) {
  const embed = new EmbedBuilder()
    .setTitle(`**${itemName}**`)
    .setColor(0xFF6B35)
    .addFields(
      { name: '💰 Price', value: `$${itemData.price.toFixed(2)}`, inline: true },
      { name: '📦 Stock', value: `${itemData.quantity}`, inline: true }
    )
    .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

  if (itemData.image) {
    embed.setImage(itemData.image);
    embed.setThumbnail(itemData.image);
  }

  return embed;
}

function generateAccountEmbed(shopName, accountName, accountData) {
  const embed = new EmbedBuilder()
    .setTitle(`🏦 **${accountName}**`)
    .setColor(0x9B59B6)
    .addFields(
      { name: '💰 Price', value: `$${accountData.price.toFixed(2)}`, inline: true },
      { name: '📦 Stock', value: `${accountData.quantity}`, inline: true }
    )
    .setDescription(accountData.description || 'No description available')
    .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

  // Ajouter les images d'inventaire
  const images = [];
  for (let i = 1; i <= 6; i++) {
    if (accountData[`image${i}`]) {
      images.push(accountData[`image${i}`]);
    }
  }

  if (images.length > 0) {
    embed.setImage(images[0]); // Image principale
    
    // Ajouter les autres images comme champs
    let imageText = '';
    images.forEach((img, index) => {
      imageText += `[Image ${index + 1}](${img}) `;
    });
    
    if (imageText) {
      embed.addFields({
        name: '🖼️ Inventory Images',
        value: imageText,
        inline: false
      });
    }
  }

  return embed;
}

// Gestion des canaux
async function getOrCreateCartChannel(guild, userId) {
  const channelName = `cart-${userId}`;
  let channel = guild.channels.cache.find(ch => ch.name === channelName);
  
  if (!channel) {
    channel = await guild.channels.create({
      name: channelName,
      type: 0,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: userId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: OWNER_ID,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
        }
      ]
    });
  }
  
  return channel;
}

async function createTicketChannel(guild, userId, cartData) {
  const channelName = `ticket-${userId}`;
  let channel = guild.channels.cache.find(ch => ch.name === channelName);
  
  if (channel) {
    await channel.delete().catch(error => console.error(`Error deleting existing ticket channel:`, error));
  }

  channel = await guild.channels.create({
    name: channelName,
    type: 0,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: userId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: OWNER_ID,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
      }
    ]
  });

  // Message de mention
  await channel.send({ content: `<@${userId}>` });
  
  // Créer l'embed de commande initial
  await updateTicketDisplay(channel, userId);
  return channel;
}

async function updateCartDisplay(channel, userId) {
  const carts = loadData(CART_FILE);
  const userCart = carts[userId] || [];
  const shops = loadData(SHOPS_FILE);
  const globalImage = shops.globalImage;

  // Générer l'embed
  const embed = new EmbedBuilder()
    .setTitle('🛒 Your Cart')
    .setColor(0x00AE86)
    .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

  if (globalImage) {
    embed.setThumbnail(globalImage);
  }

  if (userCart.length === 0) {
    embed.setDescription('Your cart is empty.');
  } else {
    // Afficher les items et comptes en colonnes (3 par ligne)
    for (let i = 0; i < userCart.length; i += 3) {
      const chunk = userCart.slice(i, i + 3);
      chunk.forEach(item => {
        const subtotal = item.price * item.quantity;
        embed.addFields({
          name: `${item.type === 'account' ? '🏦' : '📦'} ${item.name}`,
          value: `Price: $${item.price.toFixed(2)}\nQty: ${item.quantity}\nSubtotal: $${subtotal.toFixed(2)}`,
          inline: true
        });
      });
    }

    // Calculer et afficher le total
    const total = userCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    embed.addFields({
      name: '💸 Total',
      value: `$${total.toFixed(2)}`,
      inline: false
    });
  }

  // Créer les boutons
  const buttons = userCart.map(item =>
    new ButtonBuilder()
      .setCustomId(`remove_item:${item.shop}:${item.name}`)
      .setLabel(`Remove ${item.name}`)
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️')
  );

  if (userCart.length > 0) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('buy_cart')
        .setLabel('Purchase')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💳')
    );
  }

  // Créer les rows (5 boutons max par row)
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder()
      .addComponents(buttons.slice(i, i + 5));
    rows.push(row);
  }

  // Trouver le dernier message du bot
  const messages = await channel.messages.fetch({ limit: 100 });
  const botMessage = messages.find(msg => msg.author.id === client.user.id && !msg.content.includes('<@'));

  if (botMessage) {
    // Éditer le message existant
    await botMessage.edit({ embeds: [embed], components: rows });
  } else {
    // Envoyer un nouveau message si aucun n'existe
    await channel.send({ embeds: [embed], components: rows });
  }
}

async function updateTicketDisplay(channel, userId, status = 'pending') {
  const carts = loadData(CART_FILE);
  const userCart = carts[userId] || [];
  const shops = loadData(SHOPS_FILE);
  const globalImage = shops.globalImage;

  // Générer l'embed
  const embed = new EmbedBuilder()
    .setTitle('📋 Order Details')
    .setColor(status === 'sold' ? 0x00FF00 : 0xFF6B35)
    .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

  if (globalImage) {
    embed.setThumbnail(globalImage);
  }

  let description = '';
  let total = 0;

  for (const item of userCart) {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    description += `${item.type === 'account' ? '🏦' : '📦'} ${item.name} (Shop: ${item.shop})\n`;
    description += `Quantity: ${item.quantity}\n`;
    description += `Price: $${item.price.toFixed(2)}\n`;
    description += `Subtotal: $${subtotal.toFixed(2)}\n\n`;
  }

  description += `__💸 Total: $${total.toFixed(2)}__`;
  embed.setDescription(description);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('cancel_order')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(status === 'sold'),
      new ButtonBuilder()
        .setCustomId('mark_sold')
        .setLabel('Mark as Sold')
        .setStyle(ButtonStyle.Success)
        .setDisabled(status === 'sold')
    );

  if (status === 'sold') {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_order')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success)
    );
  }

  // Trouver le dernier message du bot
  const messages = await channel.messages.fetch({ limit: 100 });
  const botMessage = messages.find(msg => 
    msg.author.id === client.user.id && 
    !msg.content.includes('<@') && 
    !msg.content.includes('Please wait, your order is being prepared.')
  );

  if (botMessage) {
    // Éditer le message existant
    await botMessage.edit({ embeds: [embed], components: [row] });
  } else {
    // Envoyer un nouveau message si aucun n'existe
    await channel.send({ embeds: [embed], components: [row] });
  }
}

// Event handlers
client.once('ready', async () => {
  console.log(`Bot connected as ${client.user.tag}!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_item') {
        const [type, shopName, itemName] = interaction.values[0].split(':');
        
        if (interaction.values[0] === 'no_items') {
          const reply = await interaction.reply({ content: '❌ No items available in this shop.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];
        const item = shop?.items[itemName];

        if (!item) {
          const reply = await interaction.reply({ content: '❌ This item is no longer available.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        // Afficher l'embed de l'item avec les boutons
        const itemEmbed = generateItemEmbed(shopName, itemName, item);
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`add_to_cart_item:${shopName}:${itemName}`)
              .setLabel('Add to Cart')
              .setStyle(ButtonStyle.Success)
              .setEmoji('🛒')
              .setDisabled(item.quantity <= 0),
            new ButtonBuilder()
              .setCustomId(`back_to_shop:${shopName}`)
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⬅️')
          );

        await interaction.update({ embeds: [itemEmbed], components: [row] });

        // Programmer le retour automatique après 30 secondes
        const timeoutId = setTimeout(async () => {
          try {
            if (!interaction.isReplied() && !interaction.isDeferred()) return;
            const embed = generateShopEmbed(shopName, shop);
            const selectMenu = generateSelectMenu(shopName, shop);
            const accountSelectMenu = generateAccountSelectMenu(shopName);
            await interaction.editReply({ embeds: [embed], components: [selectMenu, accountSelectMenu] });
            interactionTimeouts.delete(interaction.id);
          } catch (error) {
            console.error('Error in auto-back timeout:', error);
          }
        }, 30000);

        // Stocker le timeout pour pouvoir l'annuler
        interactionTimeouts.set(interaction.id, timeoutId);
      }

      if (interaction.customId === 'select_account') {
        const [type, shopName, accountName] = interaction.values[0].split(':');
        
        if (interaction.values[0] === 'no_accounts') {
          const reply = await interaction.reply({ content: '❌ No accounts available in this shop.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const accounts = loadData(ACCOUNTS_FILE);
        const account = accounts[shopName]?.[accountName];

        if (!account) {
          const reply = await interaction.reply({ content: '❌ This account is no longer available.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        // Afficher l'embed du compte avec les boutons
        const accountEmbed = generateAccountEmbed(shopName, accountName, account);
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`add_to_cart_account:${shopName}:${accountName}`)
              .setLabel('Add to Cart')
              .setStyle(ButtonStyle.Success)
              .setEmoji('🛒')
              .setDisabled(account.quantity <= 0),
            new ButtonBuilder()
              .setCustomId(`back_to_shop:${shopName}`)
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⬅️')
          );

        await interaction.update({ embeds: [accountEmbed], components: [row] });

        // Programmer le retour automatique après 30 secondes
        const timeoutId = setTimeout(async () => {
          try {
            if (!interaction.isReplied() && !interaction.isDeferred()) return;
            const shops = loadData(SHOPS_FILE);
            const shop = shops[shopName];
            const embed = generateShopEmbed(shopName, shop);
            const selectMenu = generateSelectMenu(shopName, shop);
            const accountSelectMenu = generateAccountSelectMenu(shopName);
            await interaction.editReply({ embeds: [embed], components: [selectMenu, accountSelectMenu] });
            interactionTimeouts.delete(interaction.id);
          } catch (error) {
            console.error('Error in auto-back timeout:', error);
          }
        }, 30000);

        // Stocker le timeout pour pouvoir l'annuler
        interactionTimeouts.set(interaction.id, timeoutId);
      }
    }

    if (interaction.isButton()) {
      // Annuler le timeout si un bouton est cliqué
      if (interaction.message.interaction && interactionTimeouts.has(interaction.message.interaction.id)) {
        clearTimeout(interactionTimeouts.get(interaction.message.interaction.id));
        interactionTimeouts.delete(interaction.message.interaction.id);
      }

      if (interaction.customId.startsWith('add_to_cart_item:')) {
        const [_, shopName, itemName] = interaction.customId.split(':');
        
        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];
        const item = shop?.items[itemName];

        if (!item || item.quantity <= 0) {
          const reply = await interaction.reply({ content: '❌ This item is no longer available.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        // Ajouter au panier
        const carts = loadData(CART_FILE);
        if (!carts[interaction.user.id]) {
          carts[interaction.user.id] = [];
        }

        const existingItemIndex = carts[interaction.user.id].findIndex(
          cartItem => cartItem.name === itemName && cartItem.shop === shopName && cartItem.type === 'item'
        );

        if (existingItemIndex !== -1) {
          carts[interaction.user.id][existingItemIndex].quantity += 1;
        } else {
          carts[interaction.user.id].push({
            name: itemName,
            shop: shopName,
            price: item.price,
            quantity: 1,
            type: 'item'
          });
        }

        shops[shopName].items[itemName].quantity -= 1;
        saveData(SHOPS_FILE, shops);
        saveData(CART_FILE, carts);

        // Mettre à jour le cart en temps réel si ouvert
        const cartChannel = interaction.guild.channels.cache.find(ch => ch.name === `cart-${interaction.user.id}`);
        if (cartChannel) {
          await updateCartDisplay(cartChannel, interaction.user.id);
        }

        const reply = await interaction.reply({ 
          content: `✅ Your item has been added to cart! Use /cart to purchase it.`, 
          ephemeral: true 
        });
        setTimeout(() => reply.delete().catch(() => {}), 6000);
      }

      if (interaction.customId.startsWith('add_to_cart_account:')) {
        const [_, shopName, accountName] = interaction.customId.split(':');
        
        const accounts = loadData(ACCOUNTS_FILE);
        const account = accounts[shopName]?.[accountName];

        if (!account || account.quantity <= 0) {
          const reply = await interaction.reply({ content: '❌ This account is no longer available.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        // Ajouter au panier
        const carts = loadData(CART_FILE);
        if (!carts[interaction.user.id]) {
          carts[interaction.user.id] = [];
        }

        const existingItemIndex = carts[interaction.user.id].findIndex(
          cartItem => cartItem.name === accountName && cartItem.shop === shopName && cartItem.type === 'account'
        );

        if (existingItemIndex !== -1) {
          carts[interaction.user.id][existingItemIndex].quantity += 1;
        } else {
          carts[interaction.user.id].push({
            name: accountName,
            shop: shopName,
            price: account.price,
            quantity: 1,
            type: 'account'
          });
        }

        accounts[shopName][accountName].quantity -= 1;
        saveData(ACCOUNTS_FILE, accounts);
        saveData(CART_FILE, carts);

        // Mettre à jour le cart en temps réel si ouvert
        const cartChannel = interaction.guild.channels.cache.find(ch => ch.name === `cart-${interaction.user.id}`);
        if (cartChannel) {
          await updateCartDisplay(cartChannel, interaction.user.id);
        }

        const reply = await interaction.reply({ 
          content: `✅ Your account has been added to cart! Use /cart to purchase it.`, 
          ephemeral: true 
        });
        setTimeout(() => reply.delete().catch(() => {}), 6000);
      }

      if (interaction.customId.startsWith('back_to_shop:')) {
        const [_, shopName] = interaction.customId.split(':');
        const shops = loadData(SHOPS_FILE);
        const shop = shops[shopName];

        if (!shop) {
          const reply = await interaction.reply({ content: '❌ Shop not found.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const embed = generateShopEmbed(shopName, shop);
        const selectMenu = generateSelectMenu(shopName, shop);
        const accountSelectMenu = generateAccountSelectMenu(shopName);
        await interaction.update({ embeds: [embed], components: [selectMenu, accountSelectMenu] });
      }

      if (interaction.customId.startsWith('remove_item:')) {
        console.log(`Processing remove_item: ${interaction.customId}`);
        const [_, shopName, itemName] = interaction.customId.split(':');
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        console.log(`User cart:`, userCart);
        const itemIndex = userCart.findIndex(item => 
          item.name === itemName && item.shop === shopName
        );

        if (itemIndex === -1) {
          console.log(`Item ${itemName} not found in cart for user ${interaction.user.id}`);
          const reply = await interaction.reply({ content: `❌ Item ${itemName} not found in cart.`, ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const item = userCart[itemIndex];
        console.log(`Removing item: ${item.name}, quantity: ${item.quantity}, type: ${item.type}`);
        
        // Restaurer 1 au stock selon le type
        if (item.type === 'account') {
          const accounts = loadData(ACCOUNTS_FILE);
          if (accounts[item.shop]?.[item.name]) {
            accounts[item.shop][item.name].quantity += 1;
            saveData(ACCOUNTS_FILE, accounts);
            console.log(`Restored 1 to account stock for ${item.name} in ${item.shop}`);
          }
        } else {
          const shops = loadData(SHOPS_FILE);
          if (shops[item.shop]?.items[item.name]) {
            shops[item.shop].items[item.name].quantity += 1;
            saveData(SHOPS_FILE, shops);
            console.log(`Restored 1 to item stock for ${item.name} in ${item.shop}`);
          }
        }

        // Réduire la quantité ou supprimer
        if (item.quantity > 1) {
          userCart[itemIndex].quantity -= 1;
        } else {
          userCart.splice(itemIndex, 1);
        }
        
        carts[interaction.user.id] = userCart;
        saveData(CART_FILE, carts);

        // Mettre à jour l'affichage
        await updateCartDisplay(interaction.channel, interaction.user.id);
        console.log(`Cart updated for user ${interaction.user.id}`);
        
        const reply = await interaction.reply({ content: `✅ Removed one ${itemName} from cart.`, ephemeral: true });
        setTimeout(() => reply.delete().catch(() => {}), 3000);
      }

      if (interaction.customId === 'buy_cart') {
        console.log(`Processing buy_cart for user ${interaction.user.id}`);
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        console.log(`User cart for buy_cart:`, userCart);
        if (userCart.length === 0) {
          console.log(`Cart is empty for user ${interaction.user.id}`);
          const reply = await interaction.reply({ content: '❌ Your cart is empty.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const ticketChannel = await createTicketChannel(interaction.guild, interaction.user.id, userCart);
        console.log(`Ticket channel created: ${ticketChannel.name}`);
        const reply = await interaction.reply({ content: `✅ Order created in ${ticketChannel}`, ephemeral: true });
        setTimeout(() => reply.delete().catch(() => {}), 5000);
      }

      if (interaction.customId === 'cancel_order') {
        console.log(`Processing cancel_order for user ${interaction.user.id}`);
        const carts = loadData(CART_FILE);
        const userCart = carts[interaction.user.id] || [];

        // Restaurer le stock
        const shops = loadData(SHOPS_FILE);
        const accounts = loadData(ACCOUNTS_FILE);
        for (const item of userCart) {
          if (item.type === 'account') {
            if (accounts[item.shop]?.[item.name]) {
              accounts[item.shop][item.name].quantity += item.quantity;
              console.log(`Restored ${item.quantity} to account stock for ${item.name} in ${item.shop}`);
            }
          } else {
            if (shops[item.shop]?.items[item.name]) {
              shops[item.shop].items[item.name].quantity += item.quantity;
              console.log(`Restored ${item.quantity} to item stock for ${item.name} in ${item.shop}`);
            }
          }
        }
        saveData(SHOPS_FILE, shops);
        saveData(ACCOUNTS_FILE, accounts);

        // Vider le panier
        carts[interaction.user.id] = [];
        saveData(CART_FILE, carts);

        // Supprimer le ticket
        await interaction.channel.delete();
        console.log(`Ticket channel deleted for user ${interaction.user.id}`);
      }

      if (interaction.customId === 'mark_sold') {
        if (!isOwner(interaction.user.id)) {
          const reply = await interaction.reply({ content: '❌ Only the shop owner can mark an order as sold.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const userId = interaction.channel.name.replace('ticket-', '');
        await updateTicketDisplay(interaction.channel, userId, 'sold');
        await interaction.channel.send({ content: 'Please wait, your order is being prepared.' });
        const reply = await interaction.reply({ content: '✅ Order marked as sold.', ephemeral: true });
        setTimeout(() => reply.delete().catch(() => {}), 3000);
      }

      if (interaction.customId === 'confirm_order') {
        if (!isOwner(interaction.user.id)) {
          const reply = await interaction.reply({ content: '❌ Only the shop owner can confirm an order.', ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 3000);
          return;
        }

        const userId = interaction.channel.name.replace('ticket-', '');
        
        // Vider le panier
        const carts = loadData(CART_FILE);
        carts[userId] = [];
        saveData(CART_FILE, carts);

        // Mettre à jour le cart channel si ouvert
        const cartChannel = interaction.guild.channels.cache.find(ch => ch.name === `cart-${userId}`);
        if (cartChannel) {
          await updateCartDisplay(cartChannel, userId);
        }

        // Supprimer le ticket
        await interaction.channel.delete();
      }
    }

    if (interaction.isChatInputCommand()) {
      const { commandName, user } = interaction;

      // Vérification des permissions (sauf pour /cart)
      if (commandName !== 'cart' && !isOwner(user.id)) {
        const reply = await interaction.reply({ content: '❌ Only the shop owner can use this command.', ephemeral: true });
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
      }

      const shops = loadData(SHOPS_FILE);

      switch (commandName) {
        case 'createshop': {
          const name = interaction.options.getString('name');
          const image = interaction.options.getString('image');

          if (shops[name]) {
            const reply = await interaction.reply({ content: `❌ Shop ${name} already exists.`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          shops[name] = { items: {}, image: image || null };
          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `✅ Shop ${name} created.` });
          break;
        }

        case 'deleteshop': {
          const name = interaction.options.getString('name');

          if (!shops[name]) {
            const reply = await interaction.reply({ content: `❌ Shop ${name} not found.`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          delete shops[name];
          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `🗑️ Shop ${name} deleted.` });
          break;
        }

        case 'shoplist': {
          const shopNames = Object.keys(shops).filter(key => key !== 'globalImage');
          if (shopNames.length === 0) {
            const reply = await interaction.reply({ content: '📋 No shops created.', ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
          } else {
            const reply = await interaction.reply({ content: `📋 Shops: ${shopNames.join(', ')}`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
          }
          break;
        }

        case 'shop': {
          const name = interaction.options.getString('name');
          const shop = shops[name];

          if (!shop) {
            const reply = await interaction.reply({ content: `❌ Shop ${name} not found.`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          const embed = generateShopEmbed(name, shop);
          const selectMenu = generateSelectMenu(name, shop);
          const accountSelectMenu = generateAccountSelectMenu(name);
          await interaction.reply({ embeds: [embed], components: [selectMenu, accountSelectMenu] });
          break;
        }

        case 'additem': {
          const shopName = interaction.options.getString('shop');
          const itemName = interaction.options.getString('name');
          const price = interaction.options.getNumber('price');
          const quantity = interaction.options.getInteger('quantity');
          const image = interaction.options.getString('image');

          if (!shops[shopName]) {
            const reply = await interaction.reply({ content: `❌ Shop ${shopName} not found.`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          shops[shopName].items[itemName] = {
            price: price,
            quantity: quantity,
            image: image || null
          };
          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `✅ Item ${itemName} added.` });
          break;
        }

        case 'addaccount': {
          const shopName = interaction.options.getString('shop');
          const accountName = interaction.options.getString('name');
          const price = interaction.options.getNumber('price');
          const quantity = interaction.options.getInteger('quantity');
          const description = interaction.options.getString('description');
          const image1 = interaction.options.getString('image1');
          const image2 = interaction.options.getString('image2');
          const image3 = interaction.options.getString('image3');
          const image4 = interaction.options.getString('image4');
          const image5 = interaction.options.getString('image5');
          const image6 = interaction.options.getString('image6');

          const accounts = loadData(ACCOUNTS_FILE);
          if (!accounts[shopName]) {
            accounts[shopName] = {};
          }

          if (accounts[shopName][accountName]) {
            const reply = await interaction.reply({ content: `❌ Account ${accountName} already exists in ${shopName}.`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          accounts[shopName][accountName] = {
            price: price,
            quantity: quantity,
            description: description,
            image1: image1 || null,
            image2: image2 || null,
            image3: image3 || null,
            image4: image4 || null,
            image5: image5 || null,
            image6: image6 || null
          };
          saveData(ACCOUNTS_FILE, accounts);

          await interaction.reply({ content: `✅ Account ${accountName} added to ${shopName}.` });
          break;
        }

        case 'edititem': {
          const shopName = interaction.options.getString('shop');
          const itemName = interaction.options.getString('name');
          const price = interaction.options.getNumber('price');
          const quantity = interaction.options.getInteger('quantity');
          const image = interaction.options.getString('image');

          if (!shops[shopName]?.items[itemName]) {
            const reply = await interaction.reply({ content: `❌ Item ${itemName} not found in ${shopName}.`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          const item = shops[shopName].items[itemName];
          if (price !== null) item.price = price;
          if (quantity !== null) item.quantity = quantity;
          if (image !== null) item.image = image;

          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `✅ Item ${itemName} updated.` });
          break;
        }

        case 'removeitem':
        case 'deleteitem': {
          const shopName = interaction.options.getString('shop');
          const itemName = interaction.options.getString('name');

          if (!shops[shopName]?.items[itemName]) {
            const reply = await interaction.reply({ content: `❌ Item ${itemName} not found in ${shopName}.`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          delete shops[shopName].items[itemName];
          saveData(SHOPS_FILE, shops);

          await interaction.reply({ content: `🗑️ Item ${itemName} deleted.` });
          break;
        }

        case 'removeaccount': {
          const shopName = interaction.options.getString('shop');
          const accountName = interaction.options.getString('name');

          const accounts = loadData(ACCOUNTS_FILE);
          if (!accounts[shopName]?.[accountName]) {
            const reply = await interaction.reply({ content: `❌ Account ${accountName} not found in ${shopName}.`, ephemeral: true });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
          }

          delete accounts[shopName][accountName];
          if (Object.keys(accounts[shopName]).length === 0) {
            delete accounts[shopName];
          }
          saveData(ACCOUNTS_FILE, accounts);

          await interaction.reply({ content: `🗑️ Account ${accountName} removed from ${shopName}.` });
          break;
        }

        case 'itemstock': {
          const embed = new EmbedBuilder()
            .setTitle('📦 Stock Overview')
            .setColor(0x7289DA)
            .setFooter({ text: 'LorieSellShopBot | Happy Shopping!' });

          let description = '';
          for (const [shopName, shop] of Object.entries(shops)) {
            if (shopName === 'globalImage') continue;
            for (const [itemName, item] of Object.entries(shop.items)) {
              description += `${itemName} (Shop: ${shopName})\n`;
              description += `Stock: ${item.quantity}\n`;
              description += `Price: $${item.price.toFixed(2)}\n\n`;
            }
          }

          const accounts = loadData(ACCOUNTS_FILE);
          for (const [shopName, shopAccounts] of Object.entries(accounts)) {
            for (const [accountName, account] of Object.entries(shopAccounts)) {
              description += `${accountName} (Shop: ${shopName})\n`;
              description += `Stock: ${account.quantity}\n`;
              description += `Price: $${account.price.toFixed(2)}\n\n`;
            }
          }

          if (!description) {
            description = 'No items or accounts in any shop.';
          }

          embed.setDescription(description);
          const reply = await interaction.reply({ embeds: [embed], ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 5000);
          break;
        }

        case 'cart': {
          const cartChannel = await getOrCreateCartChannel(interaction.guild, interaction.user.id);
          await updateCartDisplay(cartChannel, interaction.user.id);
          
          // Message éphémère avec mention
          const reply = await interaction.reply({ 
            content: `✅ Your cart has been created here ${cartChannel} <@${interaction.user.id}>`, 
            ephemeral: true 
          });
          setTimeout(() => reply.delete().catch(() => {}), 5000);
          break;
        }

        case 'setglobalimage': {
          const image = interaction.options.getString('image');
          shops.globalImage = image;
          saveData(SHOPS_FILE, shops);
          const reply = await interaction.reply({ content: `✅ Global shop image set to ${image}.`, ephemeral: true });
          setTimeout(() => reply.delete().catch(() => {}), 5000);
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error processing interaction:', error, {
      interactionType: interaction.type,
      customId: interaction.isButton() ? interaction.customId : null,
      commandName: interaction.isChatInputCommand() ? interaction.commandName : null,
      userId: interaction.user.id
    });
    if (!interaction.replied && !interaction.deferred) {
      const reply = await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
      setTimeout(() => reply.delete().catch(() => {}), 3000);
    }
  }
});

// Vérification du token avant la connexion
if (!process.env.DISCORD_TOKEN) {
  console.error('Error: DISCORD_TOKEN not defined in .env');
  process.exit(1);
}

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);
