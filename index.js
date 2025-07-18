const { Client, GatewayIntentBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, InteractionResponseFlags } = require('discord.js');
const fs = require('fs');
const dotenv = require('dotenv');
const express = require('express');

dotenv.config();

const app = express();

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

const listener = app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

const OWNER_ID = '1384668812720476318';
const STAFF_ROLE_ID = ''; // Remplace par l'ID du rôle staff, ou laisse vide si aucun rôle staff
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const SHOPS_FILE = './shops.json';
const CART_FILE = './cart.json';
const CARTS_FILE = './carts.json';
const ITEMS_FILE = './items.json';
const SHOP_MESSAGES_FILE = './shopMessages.json';
const STOCK_MESSAGES_FILE = './stockMessages.json';

function loadData(path) {
  return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf-8')) : {};
}

function saveData(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function cleanCart(cartsData, itemsData) {
  const cleanedCarts = {};
  for (const userId in cartsData) {
    const cart = cartsData[userId].filter(entry => {
      const item = itemsData[entry.itemId];
      return !!item;
    });
    if (cart.length > 0) cleanedCarts[userId] = cart;
  }
  saveData(CARTS_FILE, cleanedCarts);
  return cleanedCarts;
}

async function updateCartMessage(channel, userId, cartsData, itemsData) {
  const cart = cartsData[userId] || [];
  let totalUSD = 0;
  const embed = new EmbedBuilder().setColor('#00AAFF').setTitle('Your Cart').setTimestamp();
  const components = [];

  if (!cart.length) {
    embed.setDescription('Your cart is empty.');
  } else {
    let validItemIndex = 0;
    for (const entry of cart) {
      const item = itemsData[entry.itemId];
      if (!item) continue;
      const lineTotal = item.price * entry.quantity;
      totalUSD += lineTotal;
      embed.addFields({
        name: `${item.name} (${item.shopName})`,
        value: `Quantity: ${entry.quantity}\nPrice: $${item.price.toFixed(2)}\nSubtotal: $${lineTotal.toFixed(2)}`
      });
      if (item.image) embed.setImage(item.image);
      if (validItemIndex % 5 === 0) {
        components.push(new ActionRowBuilder());
      }
      components[Math.floor(validItemIndex / 5)].addComponents(
        new ButtonBuilder()
          .setCustomId(`remove_${entry.itemId}`)
          .setLabel(`Remove ${item.name}`)
          .setStyle(ButtonStyle.Danger)
      );
      validItemIndex++;
    }
    if (validItemIndex > 0) {
      embed.addFields({ name: 'Total', value: `$${totalUSD.toFixed(2)}` });
      components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_cart_${userId}`)
          .setLabel('Buy')
          .setStyle(ButtonStyle.Success)
      ));
    } else {
      embed.setDescription('Your cart contains invalid items and has been cleaned.');
    }
  }

  const mentionMessage = await channel.send({ content: `<@${userId}>` });
  setTimeout(() => mentionMessage.delete().catch(() => {}), 5000);

  const messages = await channel.messages.fetch({ limit: 10 });
  const lastCartMessage = messages.find(msg => msg.author.id === client.user.id && msg.content !== `<@${userId}>` && msg.embeds.length > 0);
  if (lastCartMessage) {
    await lastCartMessage.edit({ embeds: [embed], components });
  } else {
    await channel.send({ embeds: [embed], components });
  }
}

async function updateShopMessage(shopName, shopsData, itemsData) {
  const shopMessages = loadData(SHOP_MESSAGES_FILE);
  const shopMessageData = shopMessages[shopName];
  if (!shopMessageData) return;

  const { channelId, messageId } = shopMessageData;
  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    delete shopMessages[shopName];
    saveData(SHOP_MESSAGES_FILE, shopMessages);
    return;
  }

  const shop = shopsData[shopName];
  if (!shop) {
    delete shopMessages[shopName];
    saveData(SHOP_MESSAGES_FILE, shopMessages);
    return;
  }

  const items = shop.itemIds.map(id => itemsData[id]).filter(item => item);
  const inStockItems = items.filter(i => i.quantity > 0);
  const stockEmbed = new EmbedBuilder()
    .setColor('Green')
    .setTitle(`Shop: ${shopName} - Available Items`)
    .setTimestamp();
  if (inStockItems.length > 0) {
    inStockItems.forEach(item => {
      stockEmbed.addFields({
        name: item.name,
        value: `Price: $${item.price.toFixed(2)}\nStock: ${item.quantity}`,
        inline: true
      });
    });
  } else {
    stockEmbed.setDescription('No items in stock.');
  }
  if (shop.image) stockEmbed.setImage(shop.image);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`shop_select_${shopName}`)
    .setPlaceholder('--- Choose an item ---')
    .addOptions(
      items.map(i => ({
        label: i.name + (i.quantity === 0 ? ' (Out of stock)' : ''),
        description: `Price: $${i.price.toFixed(2)}` + (i.quantity <= 5 ? ` (Low stock: ${i.quantity})` : ''),
        value: i.id
      }))
    );

  const menuEmbed = new EmbedBuilder()
    .setColor('Green')
    .setDescription('Select an item below to view details.');

  try {
    const message = await channel.messages.fetch(messageId);
    if (message.author.id === client.user.id) {
      await message.edit({
        embeds: [stockEmbed, menuEmbed],
        components: [new ActionRowBuilder().addComponents(menu)]
      });
    }
  } catch (error) {
    delete shopMessages[shopName];
    saveData(SHOP_MESSAGES_FILE, shopMessages);
  }
}

async function updateStockMessage(shopsData, itemsData) {
  const stockMessages = loadData(STOCK_MESSAGES_FILE);
  for (const channelId in stockMessages) {
    const messageId = stockMessages[channelId];
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      delete stockMessages[channelId];
      continue;
    }

    const itemsInStock = Object.entries(shopsData).flatMap(([shop, data]) =>
      data.itemIds.map(id => [shop, itemsData[id]]).filter(([_, item]) => item)
    );
    const embed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle('Item Stock Overview')
      .setTimestamp();
    if (itemsInStock.length > 0) {
      itemsInStock.forEach(([shop, item]) => {
        embed.addFields({
          name: `${item.name} (${shop})`,
          value: `Stock: ${item.quantity}\nPrice: $${item.price.toFixed(2)}`,
          inline: true
        });
      });
    } else {
      embed.setDescription('No items in stock.');
    }

    try {
      const message = await channel.messages.fetch(messageId);
      if (message.author.id === client.user.id) {
        await message.edit({ embeds: [embed], components: [] });
      }
    } catch (error) {
      delete stockMessages[channelId];
    }
  }
  saveData(STOCK_MESSAGES_FILE, stockMessages);
}

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  const shops = loadData(SHOPS_FILE);
  const carts = loadData(CARTS_FILE);
  const items = loadData(ITEMS_FILE);
  cleanCart(carts, items);

  const commands = [
    new SlashCommandBuilder()
      .setName('createshop')
      .setDescription('Create a new shop')
      .addStringOption(o => o.setName('name').setDescription('Shop name').setRequired(true))
      .addStringOption(o => o.setName('image').setDescription('Shop image (URL)').setRequired(false)),
    new SlashCommandBuilder()
      .setName('deleteshop')
      .setDescription('Delete a shop')
      .addStringOption(o => o.setName('name').setDescription('Name of the shop to delete').setRequired(true)),
    new SlashCommandBuilder()
      .setName('shoplist')
      .setDescription('List all available shops'),
    new SlashCommandBuilder()
      .setName('shop')
      .setDescription('Display items in a shop')
      .addStringOption(o => o.setName('name').setDescription('Shop name').setRequired(true)),
    new SlashCommandBuilder()
      .setName('additem')
      .setDescription('Add an item to the shop')
      .addStringOption(o => o.setName('shop').setDescription('Shop name').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
      .addNumberOption(o => o.setName('price').setDescription('Price').setRequired(true))
      .addIntegerOption(o => o.setName('quantity').setDescription('Quantity').setRequired(true))
      .addStringOption(o => o.setName('image').setDescription('Image (URL)').setRequired(false)),
    new SlashCommandBuilder()
      .setName('edititem')
      .setDescription('Edit an existing item')
      .addStringOption(o => o.setName('shop').setDescription('Shop name').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
      .addNumberOption(o => o.setName('price').setDescription('New price').setRequired(false))
      .addIntegerOption(o => o.setName('quantity').setDescription('New quantity').setRequired(false))
      .addStringOption(o => o.setName('image').setDescription('New image (URL)').setRequired(false)),
    new SlashCommandBuilder()
      .setName('removeitem')
      .setDescription('Remove an item from the shop')
      .addStringOption(o => o.setName('shop').setDescription('Shop name').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true)),
    new SlashCommandBuilder()
      .setName('cart')
      .setDescription('View and manage your cart'),
    new SlashCommandBuilder()
      .setName('itemstock')
      .setDescription('View stock of all items across all shops')
  ];

  await client.application.commands.set(commands);
  console.log('Les commandes Slash ont été enregistrées avec succès.');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;
  const userId = interaction.user.id;
  const shops = loadData(SHOPS_FILE);
  let carts = loadData(CARTS_FILE);
  const items = loadData(ITEMS_FILE);
  carts = cleanCart(carts, items);

  if (interaction.isChatInputCommand()) {
    const cmd = interaction.commandName;
    if (userId !== OWNER_ID && cmd !== 'cart' && cmd !== 'shop' && cmd !== 'shoplist' && cmd !== 'itemstock') {
      return interaction.reply({ content: '❌ You don\'t have permission.', flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (cmd === 'createshop') {
      const name = interaction.options.getString('name');
      const image = interaction.options.getString('image') || null;
      if (shops[name]) {
        return interaction.reply({ content: `❌ Shop **${name}** already exists.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      shops[name] = { itemIds: [], image };
      saveData(SHOPS_FILE, shops);
      return interaction.reply({ content: `✅ Shop **${name}** created.`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (cmd === 'deleteshop') {
      const name = interaction.options.getString('name');
      if (!shops[name]) {
        return interaction.reply({ content: `❌ Shop **${name}** not found.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      delete shops[name];
      saveData(SHOPS_FILE, shops);
      const shopMessages = loadData(SHOP_MESSAGES_FILE);
      delete shopMessages[name];
      saveData(SHOP_MESSAGES_FILE, shopMessages);
      await updateStockMessage(shops, items);
      return interaction.reply({ content: `🗑️ Shop **${name}** deleted.`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (cmd === 'shoplist') {
      const names = Object.keys(shops);
      if (!names.length) {
        return interaction.reply({ content: '🚫 No shops available.', flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      return interaction.reply({ content: `📋 Shops: ${names.map(n => `**${n}**`).join(', ')}`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (cmd === 'shop') {
      const shopName = interaction.options.getString('name');
      const shop = shops[shopName];
      if (!shop) {
        return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const shopItems = shop.itemIds.map(id => items[id]).filter(item => item);
      if (!shopItems.length) {
        return interaction.reply({ content: `🚫 Shop **${shopName}** is empty.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      const inStockItems = shopItems.filter(i => i.quantity > 0);
      const stockEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle(`Shop: ${shopName} - Available Items`)
        .setTimestamp();
      if (inStockItems.length > 0) {
        inStockItems.forEach(item => {
          stockEmbed.addFields({
            name: item.name,
            value: `Price: $${item.price.toFixed(2)}\nStock: ${item.quantity}`,
            inline: true
          });
        });
      } else {
        stockEmbed.setDescription('No items in stock.');
      }
      if (shop.image) stockEmbed.setImage(shop.image);

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`shop_select_${shopName}`)
        .setPlaceholder('--- Choose an item ---')
        .addOptions(
          shopItems.map(i => ({
            label: i.name + (i.quantity === 0 ? ' (Out of stock)' : ''),
            description: `Price: $${i.price.toFixed(2)}` + (i.quantity <= 5 ? ` (Low stock: ${i.quantity})` : ''),
            value: i.id
          }))
        );

      const menuEmbed = new EmbedBuilder()
        .setColor('Green')
        .setDescription('Select an item below to view details.');

      await interaction.reply({
        embeds: [stockEmbed, menuEmbed],
        components: [new ActionRowBuilder().addComponents(menu)]
      });
      const message = await interaction.fetchReply();
      const shopMessages = loadData(SHOP_MESSAGES_FILE);
      shopMessages[shopName] = { channelId: interaction.channelId, messageId: message.id };
      saveData(SHOP_MESSAGES_FILE, shopMessages);
    }

    if (cmd === 'additem') {
      const shopName = interaction.options.getString('shop');
      const shop = shops[shopName];
      const name = interaction.options.getString('name');
      const price = interaction.options.getNumber('price');
      const quantity = interaction.options.getInteger('quantity');
      const image = interaction.options.getString('image') || null;
      if (!shop) {
        return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const itemId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      items[itemId] = { id: itemId, name, price, quantity, image, shopName };
      shop.itemIds.push(itemId);
      saveData(ITEMS_FILE, items);
      saveData(SHOPS_FILE, shops);
      await updateShopMessage(shopName, shops, items);
      await updateStockMessage(shops, items);
      return interaction.reply({ content: `✅ Item **${name}** added to shop **${shopName}**.`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (cmd === 'edititem') {
      const shopName = interaction.options.getString('shop');
      const name = interaction.options.getString('name');
      const shop = shops[shopName];
      if (!shop) {
        return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const item = Object.values(items).find(i => i.name === name && shop.itemIds.includes(i.id));
      if (!item) {
        return interaction.reply({ content: `❌ Item **${name}** not found.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const price = interaction.options.getNumber('price');
      const quantity = interaction.options.getInteger('quantity');
      const image = interaction.options.getString('image');
      if (price !== null) item.price = price;
      if (quantity !== null) item.quantity = quantity;
      if (image) item.image = image;
      saveData(ITEMS_FILE, items);
      await updateShopMessage(shopName, shops, items);
      await updateStockMessage(shops, items);
      return interaction.reply({ content: `✅ Item **${name}** updated in shop **${shopName}**.`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (cmd === 'removeitem') {
      const shopName = interaction.options.getString('shop');
      const name = interaction.options.getString('name');
      const shop = shops[shopName];
      if (!shop) {
        return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const item = Object.values(items).find(i => i.name === name && shop.itemIds.includes(i.id));
      if (!item) {
        return interaction.reply({ content: `❌ Item **${name}** not found.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      shop.itemIds = shop.itemIds.filter(id => id !== item.id);
      delete items[item.id];
      saveData(ITEMS_FILE, items);
      saveData(SHOPS_FILE, shops);
      await updateShopMessage(shopName, shops, items);
      await updateStockMessage(shops, items);
      return interaction.reply({ content: `🗑️ Item **${name}** removed from shop **${shopName}**.`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (cmd === 'cart') {
      const cartsData = carts;
      const cart = cartsData[userId] || [];
      let channel = interaction.guild.channels.cache.find(c => c.name === `cart-${userId}` && c.type === ChannelType.GuildText);
      if (!channel) {
        channel = await interaction.guild.channels.create({
          name: `cart-${userId}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: OWNER_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
          ]
        });
        setTimeout(async () => {
          const cartsData = loadData(CARTS_FILE);
          const userCart = cartsData[userId] || [];
          if (userCart.length) {
            const itemsData = loadData(ITEMS_FILE);
            userCart.forEach(entry => {
              const item = itemsData[entry.itemId];
              if (item) item.quantity += entry.quantity;
            });
            delete cartsData[userId];
            saveData(ITEMS_FILE, itemsData);
            saveData(CARTS_FILE, cartsData);
            for (const shopName of new Set(userCart.map(entry => itemsData[entry.itemId]?.shopName))) {
              if (shopName) await updateShopMessage(shopName, shops, itemsData);
            }
            await updateStockMessage(shops, itemsData);
          }
          channel.delete().catch(() => {});
        }, 12 * 3600000);
      }
      await updateCartMessage(channel, userId, cartsData, items);
      return interaction.reply({ content: `🆗 Your cart has been sent to ${channel}.`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (cmd === 'itemstock') {
      const itemsInStock = Object.entries(shops).flatMap(([shop, data]) =>
        data.itemIds.map(id => [shop, items[id]]).filter(([_, item]) => item)
      );
      const embed = new EmbedBuilder()
        .setColor('#FFAA00')
        .setTitle('Item Stock Overview')
        .setTimestamp();
      if (itemsInStock.length > 0) {
        itemsInStock.forEach(([shop, item]) => {
          embed.addFields({
            name: `${item.name} (${shop})`,
            value: `Stock: ${item.quantity}\nPrice: $${item.price.toFixed(2)}`,
            inline: true
          });
        });
      } else {
        embed.setDescription('No items in stock.');
      }
      await interaction.reply({ embeds: [embed] });
      const message = await interaction.fetchReply();
      const stockMessages = loadData(STOCK_MESSAGES_FILE);
      stockMessages[interaction.channelId] = message.id;
      saveData(STOCK_MESSAGES_FILE, stockMessages);
    }
  }

  if (interaction.isStringSelectMenu()) {
    const shopName = interaction.customId.replace('shop_select_', '');
    const shop = shops[shopName];
    if (!shop) {
      return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }
    const item = items[interaction.values[0]];
    if (!item) {
      return interaction.reply({ content: `❌ Item not found.`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }
    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle(item.name)
      .setDescription(`Price: $${item.price.toFixed(2)}\nStock: ${item.quantity}` + (item.quantity === 0 ? ' (Out of stock)' : ''));
    if (item.image) embed.setImage(item.image);
    return interaction.update({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`add_${item.id}`)
            .setLabel(item.quantity > 0 ? 'Add to cart' : 'Out of stock')
            .setDisabled(item.quantity === 0)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`back_${shopName}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
        )
      ]
    });
  }

  if (interaction.isButton()) {
    const [action, ...rest] = interaction.customId.split('_');
    const userIdFromButton = rest[rest.length - 1];
    const shopName = action === 'buy' || action === 'remove' ? items[rest[0]]?.shopName : rest.slice(0, -1).join('_');
    const itemId = action === 'buy' ? null : rest[0];

    if (action === 'buy' && interaction.customId.startsWith('buy_cart_')) {
      if (userId !== userIdFromButton) {
        return interaction.reply({ content: '❌ This is not your cart.', flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const cart = carts[userId] || [];
      if (!cart.length) {
        return interaction.reply({ content: '❌ Your cart is empty.', flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      const permissionOverwrites = [
        { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: OWNER_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
      ];
      if (STAFF_ROLE_ID) {
        permissionOverwrites.push({
          id: STAFF_ROLE_ID,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
        });
      }

      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${userId}`,
        type: ChannelType.GuildText,
        permissionOverwrites
      });

      let totalUSD = 0;
      const embed = new EmbedBuilder()
        .setColor('#00AAFF')
        .setTitle('Order Details')
        .setTimestamp();
      for (const entry of cart) {
        const item = items[entry.itemId];
        if (!item) continue;
        const lineTotal = item.price * entry.quantity;
        totalUSD += lineTotal;
        embed.addFields({
          name: `${item.name} (${item.shopName})`,
          value: `Quantity: ${entry.quantity}\nPrice: $${item.price.toFixed(2)}\nSubtotal: $${lineTotal.toFixed(2)}`
        });
        if (item.image && !embed.data.image) embed.setImage(item.image);
      }
      embed.addFields({ name: 'Total', value: `$${totalUSD.toFixed(2)}` });

      const components = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`cancel_order_${userId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`sold_order_${userId}`)
            .setLabel('Sold')
            .setStyle(ButtonStyle.Success)
        )
      ];

      const mentionMessage = await ticketChannel.send({ content: `<@${userId}>` });
      setTimeout(() => mentionMessage.delete().catch(() => {}), 5000);

      await ticketChannel.send({ embeds: [embed], components });
      return interaction.reply({ content: `✅ Order ticket created: ${ticketChannel}.`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (action === 'cancel') {
      if (userId !== userIdFromButton && userId !== OWNER_ID && (!STAFF_ROLE_ID || !interaction.member.roles.cache.has(STAFF_ROLE_ID))) {
        return interaction.reply({ content: '❌ You don\'t have permission to cancel this order.', flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const cart = carts[userIdFromButton] || [];
      if (!cart.length) {
        return interaction.reply({ content: '❌ Cart is empty.', flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      cart.forEach(entry => {
        const item = items[entry.itemId];
        if (item) item.quantity += entry.quantity;
      });
      delete carts[userIdFromButton];
      saveData(ITEMS_FILE, items);
      saveData(CARTS_FILE, carts);

      const cartChannel = interaction.guild.channels.cache.find(c => c.name === `cart-${userIdFromButton}` && c.type === ChannelType.GuildText);
      if (cartChannel) await cartChannel.delete().catch(() => {});
      if (interaction.channel.name.startsWith('ticket-')) await interaction.channel.delete().catch(() => {});

      const updatedShops = new Set(cart.map(entry => items[entry.itemId]?.shopName));
      for (const shopName of updatedShops) {
        if (shopName) await updateShopMessage(shopName, shops, items);
      }
      await updateStockMessage(shops, items);

      return interaction.reply({ content: '🗑️ Order cancelled and stock restored.', flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (action === 'sold') {
      if (userId !== userIdFromButton && userId !== OWNER_ID && (!STAFF_ROLE_ID || !interaction.member.roles.cache.has(STAFF_ROLE_ID))) {
        return interaction.reply({ content: '❌ You don\'t have permission to mark this order as sold.', flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const cart = carts[userIdFromButton] || [];
      if (!cart.length) {
        return interaction.reply({ content: '❌ Cart is empty.', flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      const mentionMessage = await interaction.channel.send({ content: `<@${userIdFromButton}> Veuillez attendre patiemment que votre commande soit préparée.` });
      setTimeout(() => {
        mentionMessage.edit({ content: 'Veuillez attendre patiemment que votre commande soit préparée.' }).catch(() => {});
      }, 5000);

      const components = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_final_${userIdFromButton}`)
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success)
        )
      ];

      await interaction.message.edit({ components });

      const updatedShops = new Set(cart.map(entry => items[entry.itemId]?.shopName));
      for (const shopName of updatedShops) {
        if (shopName) await updateShopMessage(shopName, shops, items);
      }
      await updateStockMessage(shops, items);

      return interaction.reply({ content: '✅ Order marked as sold, please confirm to finalize.', flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (action === 'confirm' && interaction.customId.startsWith('confirm_final_')) {
      if (userId !== userIdFromButton && userId !== OWNER_ID && (!STAFF_ROLE_ID || !interaction.member.roles.cache.has(STAFF_ROLE_ID))) {
        return interaction.reply({ content: '❌ You don\'t have permission to finalize this order.', flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const cart = carts[userIdFromButton] || [];
      if (!cart.length) {
        return interaction.reply({ content: '❌ Cart is empty.', flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      delete carts[userIdFromButton];
      saveData(CARTS_FILE, carts);

      const cartChannel = interaction.guild.channels.cache.find(c => c.name === `cart-${userIdFromButton}` && c.type === ChannelType.GuildText);
      if (cartChannel) await cartChannel.delete().catch(() => {});
      if (interaction.channel.name.startsWith('ticket-')) await interaction.channel.delete().catch(() => {});

      const updatedShops = new Set(cart.map(entry => items[entry.itemId]?.shopName));
      for (const shopName of updatedShops) {
        if (shopName) await updateShopMessage(shopName, shops, items);
      }
      await updateStockMessage(shops, items);

      return interaction.reply({ content: '✅ Order finalized.', flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (action === 'add') {
      const item = items[itemId];
      if (!item) {
        return interaction.reply({ content: `❌ Item not found.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      if (!item.quantity) {
        return interaction.reply({ content: '⚠️ Out of stock.', flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      item.quantity--;
      saveData(ITEMS_FILE, items);
      let userCart = carts[userId] || [];
      let entry = userCart.find(e => e.itemId === itemId);
      if (entry) entry.quantity++;
      else userCart.push({ itemId, quantity: 1 });
      carts[userId] = userCart;
      saveData(CARTS_FILE, carts);
      const channel = interaction.guild.channels.cache.find(c => c.name === `cart-${userId}` && c.type === ChannelType.GuildText);
      if (channel) await updateCartMessage(channel, userId, carts, items);
      await updateShopMessage(item.shopName, shops, items);
      await updateStockMessage(shops, items);
      return interaction.reply({ content: `✅ Item **${item.name}** added to cart. Stock: ${item.quantity}`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }

    if (action === 'back') {
      const shop = shops[shopName];
      if (!shop) {
        return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const shopItems = shop.itemIds.map(id => items[id]).filter(item => item);
      if (!shopItems.length) {
        return interaction.reply({ content: `❌ Shop **${shopName}** is empty.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const inStockItems = shopItems.filter(i => i.quantity > 0);
      const stockEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle(`Shop: ${shopName} - Available Items`)
        .setTimestamp();
      if (inStockItems.length > 0) {
        inStockItems.forEach(item => {
          stockEmbed.addFields({
            name: item.name,
            value: `Price: $${item.price.toFixed(2)}\nStock: ${item.quantity}`,
            inline: true
          });
        });
      } else {
        stockEmbed.setDescription('No items in stock.');
      }
      if (shop.image) stockEmbed.setImage(shop.image);

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`shop_select_${shopName}`)
        .setPlaceholder('--- Choose an item ---')
        .addOptions(shopItems.map(i => ({
          label: i.name + (i.quantity === 0 ? ' (Out of stock)' : ''),
          description: `Price: $${i.price.toFixed(2)}` + (i.quantity <= 5 ? ` (Low stock: ${i.quantity})` : ''),
          value: i.id
        })));
      const menuEmbed = new EmbedBuilder()
        .setColor('Green')
        .setDescription('Select an item below to view details.');

      return interaction.update({
        embeds: [stockEmbed, menuEmbed],
        components: [new ActionRowBuilder().addComponents(menu)]
      });
    }

    if (action === 'remove') {
      const item = items[itemId];
      if (!item) {
        return interaction.reply({ content: `❌ Item not found.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      let userCart = carts[userId] || [];
      const entry = userCart.find(e => e.itemId === itemId);
      if (!entry) {
        return interaction.reply({ content: `❌ Item **${item.name}** not in your cart.`, flags: InteractionResponseFlags.Ephemeral })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      item.quantity += 1;
      if (entry.quantity > 1) {
        entry.quantity -= 1;
      } else {
        userCart = userCart.filter(e => e.itemId !== itemId);
      }
      if (userCart.length === 0) {
        delete carts[userId];
      } else {
        carts[userId] = userCart;
      }
      saveData(ITEMS_FILE, items);
      saveData(CARTS_FILE, carts);
      const channel = interaction.guild.channels.cache.find(c => c.name === `cart-${userId}` && c.type === ChannelType.GuildText);
      if (channel) await updateCartMessage(channel, userId, carts, items);
      await updateShopMessage(item.shopName, shops, items);
      await updateStockMessage(shops, items);
      return interaction.reply({ content: `🗑️ Removed 1 **${item.name}** from cart.`, flags: InteractionResponseFlags.Ephemeral })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('Failed to login:', err.message);
});