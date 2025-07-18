const { Client, GatewayIntentBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
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
const STAFF_ROLE_ID = ''; // Replace with staff role ID if needed
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const SHOPS_FILE = './shops.json';
const CART_FILE = './cart.json';
const SHOP_MESSAGES_FILE = './shopMessages.json';
const STOCK_MESSAGES_FILE = './stockMessages.json';

function normalizeName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    console.error('Invalid name for normalization:', name);
    return '';
  }
  return name.toLowerCase().replace(/\s+/g, '-').trim();
}

function loadData(path) {
  try {
    if (!fs.existsSync(path)) return {};
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
    // Validate shops data
    for (const shopName in data) {
      if (!data[shopName].items) data[shopName].items = [];
      data[shopName].items = data[shopName].items.filter(item => item && item.name && item.normalizedName && typeof item.normalizedName === 'string');
    }
    return data;
  } catch (error) {
    console.error(`Error loading ${path}:`, error);
    return {};
  }
}

function saveData(path, data) {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving ${path}:`, error);
  }
}

function cleanCart(cartsData, shopsData) {
  const cleanedCarts = {};
  for (const userId in cartsData) {
    const cart = cartsData[userId].filter(entry => {
      const shop = shopsData[entry.shop];
      if (!shop) return false;
      const item = shop.items.find(i => i.normalizedName === normalizeName(entry.name));
      return !!item;
    });
    if (cart.length > 0) cleanedCarts[userId] = cart;
  }
  saveData(CART_FILE, cleanedCarts);
  return cleanedCarts;
}

async function updateCartMessage(channel, userId, cartsData, shopsData) {
  try {
    const cart = cartsData[userId] || [];
    let totalUSD = 0;
    const embed = new EmbedBuilder().setColor('#00AAFF').setTitle('Your Cart').setTimestamp();
    const components = [];

    if (!cart.length) {
      embed.setDescription('Your cart is empty.');
    } else {
      let validItemIndex = 0;
      for (const entry of cart) {
        const shop = shopsData[entry.shop];
        if (!shop) {
          console.log(`Shop not found for cart entry: ${entry.shop}`);
          continue;
        }
        const item = shop.items.find(i => i.normalizedName === normalizeName(entry.name));
        if (!item) {
          console.log(`Item not found for cart entry: ${entry.name} in shop ${entry.shop}`);
          continue;
        }
        const lineTotal = item.price * entry.quantity;
        totalUSD += lineTotal;
        embed.addFields({
          name: entry.name + ' (' + entry.shop + ')',
          value: `Quantity: ${entry.quantity}\nPrice: $${item.price.toFixed(2)}\nSubtotal: $${lineTotal.toFixed(2)}`
        });
        if (item.image) embed.setImage(item.image);
        if (validItemIndex % 5 === 0) {
          components.push(new ActionRowBuilder());
        }
        components[Math.floor(validItemIndex / 5)].addComponents(
          new ButtonBuilder()
            .setCustomId(`remove_${entry.shop}_${entry.normalizedName}`)
            .setLabel(`Remove ${entry.name}`)
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
    const lastMessage = messages.find(m => m.author.id === client.user.id && m.content !== `<@${userId}>`);
    if (lastMessage) {
      await lastMessage.edit({ embeds: [embed], components });
    } else {
      await channel.send({ embeds: [embed], components });
    }
  } catch (error) {
    console.error('Error in updateCartMessage:', error);
  }
}

async function updateShopMessage(shopName, shopsData) {
  try {
    const shopMessages = loadData(SHOP_MESSAGES_FILE);
    const shopMessageData = shopMessages[shopName];
    if (!shopMessageData) return;

    const { channelId, messageId } = shopMessageData;
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      console.log(`Channel not found for shop message: ${shopName}, channelId: ${channelId}`);
      delete shopMessages[shopName];
      saveData(SHOP_MESSAGES_FILE, shopMessages);
      return;
    }

    const shop = shopsData[shopName];
    if (!shop) {
      console.log(`Shop not found for updating message: ${shopName}`);
      delete shopMessages[shopName];
      saveData(SHOP_MESSAGES_FILE, shopMessages);
      return;
    }

    const items = shop.items || [];
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
          description: `Price: $${i.price.toFixed(2)}${i.quantity <= 5 ? ` (Low stock: ${i.quantity})` : ''}`,
          value: i.normalizedName
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
      } else {
        console.log(`Message not authored by bot for shop: ${shopName}, creating new message`);
        const newMessage = await channel.send({
          embeds: [stockEmbed, menuEmbed],
          components: [new ActionRowBuilder().addComponents(menu)]
        });
        shopMessages[shopName] = { channelId, messageId: newMessage.id };
        saveData(SHOP_MESSAGES_FILE, shopMessages);
      }
    } catch (error) {
      console.error(`Error updating shop message for ${shopName}:`, error);
      console.log(`Creating new message for shop: ${shopName}`);
      const newMessage = await channel.send({
        embeds: [stockEmbed, menuEmbed],
        components: [new ActionRowBuilder().addComponents(menu)]
      });
      shopMessages[shopName] = { channelId, messageId: newMessage.id };
      saveData(SHOP_MESSAGES_FILE, shopMessages);
    }
  } catch (error) {
    console.error(`Error in updateShopMessage for ${shopName}:`, error);
  }
}

async function updateStockMessage(shopsData) {
  try {
    const stockMessages = loadData(STOCK_MESSAGES_FILE);
    for (const channelId in stockMessages) {
      const messageId = stockMessages[channelId];
      const channel = client.channels.cache.get(channelId);
      if (!channel) {
        console.log(`Channel not found for stock message: ${channelId}`);
        delete stockMessages[channelId];
        continue;
      }

      const itemsInStock = Object.entries(shopsData).flatMap(([shop, data]) =>
        data.items.map(item => [shop, item])
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
        } else {
          console.log(`Stock message not authored by bot in channel ${channelId}, creating new message`);
          const newMessage = await channel.send({ embeds: [embed], components: [] });
          stockMessages[channelId] = newMessage.id;
        }
      } catch (error) {
        console.error(`Error updating stock message for channel ${channelId}:`, error);
        console.log(`Creating new stock message for channel ${channelId}`);
        const newMessage = await channel.send({ embeds: [embed], components: [] });
        stockMessages[channelId] = newMessage.id;
      }
    }
    saveData(STOCK_MESSAGES_FILE, stockMessages);
  } catch (error) {
    console.error('Error in updateStockMessage:', error);
  }
}

client.once('ready', async () => {
  console.log('✅ Logged in as ' + client.user.tag);
  const shops = loadData(SHOPS_FILE);
  const carts = loadData(CART_FILE);
  cleanCart(carts, shops);

  // Clean shopMessages.json
  const shopMessages = loadData(SHOP_MESSAGES_FILE);
  for (const shopName in shopMessages) {
    if (!shops[shopName]) {
      console.log(`Removing stale shop message for non-existent shop: ${shopName}`);
      delete shopMessages[shopName];
    }
  }
  saveData(SHOP_MESSAGES_FILE, shopMessages);

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
      .setDescription('View stock of all items across all shops'),
    new SlashCommandBuilder()
      .setName('deleteitem')
      .setDescription('Delete an item from the shop')
      .addStringOption(o => o.setName('shop').setDescription('Shop name').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
  ];

  try {
    await client.application.commands.set(commands);
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;
  try {
    const userId = interaction.user.id;
    const shops = loadData(SHOPS_FILE);
    let carts = loadData(CART_FILE);
    carts = cleanCart(carts, shops);

    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ ephemeral: true });
      const cmd = interaction.commandName;
      if (userId !== OWNER_ID && cmd !== 'cart' && cmd !== 'shop' && cmd !== 'shoplist' && cmd !== 'itemstock') {
        await interaction.editReply({ content: '❌ You don\'t have permission.' });
        return;
      }

      if (cmd === 'createshop') {
        const name = normalizeName(interaction.options.getString('name'));
        if (!name) {
          await interaction.editReply({ content: '❌ Invalid shop name.' });
          return;
        }
        const image = interaction.options.getString('image') || null;
        if (shops[name]) {
          await interaction.editReply({ content: `❌ Shop **${name}** already exists.` });
          return;
        }
        shops[name] = { items: [], image };
        saveData(SHOPS_FILE, shops);
        await interaction.editReply({ content: `✅ Shop **${name}** created.` });
        return;
      }

      if (cmd === 'deleteshop') {
        const name = normalizeName(interaction.options.getString('name'));
        if (!name) {
          await interaction.editReply({ content: '❌ Invalid shop name.' });
          return;
        }
        if (!shops[name]) {
          await interaction.editReply({ content: `❌ Shop **${name}** not found.` });
          return;
        }
        delete shops[name];
        saveData(SHOPS_FILE, shops);
        const shopMessages = loadData(SHOP_MESSAGES_FILE);
        delete shopMessages[name];
        saveData(SHOP_MESSAGES_FILE, shopMessages);
        await updateStockMessage(shops);
        await interaction.editReply({ content: `🗑️ Shop **${name}** deleted.` });
        return;
      }

      if (cmd === 'shoplist') {
        const names = Object.keys(shops);
        if (!names.length) {
          await interaction.editReply({ content: '🚫 No shops available.' });
          return;
        }
        await interaction.editReply({ content: `📋 Shops: ${names.map(n => `**${n}**`).join(', ')}` });
        return;
      }

      if (cmd === 'shop') {
        const shopName = normalizeName(interaction.options.getString('name'));
        if (!shopName) {
          await interaction.editReply({ content: '❌ Invalid shop name.' });
          return;
        }
        const shop = shops[shopName];
        if (!shop) {
          await interaction.editReply({ content: `❌ Shop **${shopName}** not found.` });
          return;
        }
        const items = shop.items || [];
        if (!items.length) {
          await interaction.editReply({ content: `🚫 Shop **${shopName}** is empty.` });
          return;
        }

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
              description: `Price: $${i.price.toFixed(2)}${i.quantity <= 5 ? ` (Low stock: ${i.quantity})` : ''}`,
              value: i.normalizedName
            }))
          );

        const menuEmbed = new EmbedBuilder()
          .setColor('Green')
          .setDescription('Select an item below to view details.');

        const message = await interaction.channel.send({
          embeds: [stockEmbed, menuEmbed],
          components: [new ActionRowBuilder().addComponents(menu)]
        });

        const shopMessages = loadData(SHOP_MESSAGES_FILE);
        shopMessages[shopName] = { channelId: interaction.channelId, messageId: message.id };
        saveData(SHOP_MESSAGES_FILE, shopMessages);
        await interaction.editReply({ content: `🆗 Shop **${shopName}** displayed.` });
        return;
      }

      if (cmd === 'additem') {
        const shopName = normalizeName(interaction.options.getString('shop'));
        if (!shopName) {
          await interaction.editReply({ content: '❌ Invalid shop name.' });
          return;
        }
        const shop = shops[shopName];
        const name = interaction.options.getString('name');
        const normalizedName = normalizeName(name);
        if (!normalizedName) {
          await interaction.editReply({ content: '❌ Invalid item name.' });
          return;
        }
        const price = interaction.options.getNumber('price');
        const quantity = interaction.options.getInteger('quantity');
        const image = interaction.options.getString('image') || null;
        if (!shop) {
          await interaction.editReply({ content: `❌ Shop **${shopName}** not found.` });
          return;
        }
        if (shop.items.some(i => i.normalizedName === normalizedName)) {
          await interaction.editReply({ content: `❌ Item **${name}** already exists in shop **${shopName}**.` });
          return;
        }
        shop.items.push({ name, normalizedName, price, quantity, image });
        saveData(SHOPS_FILE, shops);
        await updateShopMessage(shopName, shops);
        await updateStockMessage(shops);
        await interaction.editReply({ content: `✅ Item **${name}** added to shop **${shopName}**.` });
        return;
      }

      if (cmd === 'edititem') {
        const shopName = normalizeName(interaction.options.getString('shop'));
        if (!shopName) {
          await interaction.editReply({ content: '❌ Invalid shop name.' });
          return;
        }
        const name = interaction.options.getString('name');
        const normalizedName = normalizeName(name);
        if (!normalizedName) {
          await interaction.editReply({ content: '❌ Invalid item name.' });
          return;
        }
        const shop = shops[shopName];
        if (!shop) {
          await interaction.editReply({ content: `❌ Shop **${shopName}** not found.` });
          return;
        }
        const item = shop.items.find(i => i.normalizedName === normalizedName);
        if (!item) {
          await interaction.editReply({ content: `❌ Item **${name}** not found in shop **${shopName}**.` });
          return;
        }
        const price = interaction.options.getNumber('price');
        const quantity = interaction.options.getInteger('quantity');
        const image = interaction.options.getString('image');
        if (price !== null) item.price = price;
        if (quantity !== null) item.quantity = quantity;
        if (image) item.image = image;
        saveData(SHOPS_FILE, shops);
        await updateShopMessage(shopName, shops);
        await updateStockMessage(shops);
        await interaction.editReply({ content: `✅ Item **${name}** updated in shop **${shopName}**.` });
        return;
      }

      if (cmd === 'removeitem') {
        const shopName = normalizeName(interaction.options.getString('shop'));
        if (!shopName) {
          await interaction.editReply({ content: '❌ Invalid shop name.' });
          return;
        }
        const name = interaction.options.getString('name');
        const normalizedName = normalizeName(name);
        if (!normalizedName) {
          await interaction.editReply({ content: '❌ Invalid item name.' });
          return;
        }
        const shop = shops[shopName];
        if (!shop) {
          await interaction.editReply({ content: `❌ Shop **${shopName}** not found.` });
          return;
        }
        const filtered = shop.items.filter(i => i.normalizedName !== normalizedName);
        shops[shopName].items = filtered;
        saveData(SHOPS_FILE, shops);
        await updateShopMessage(shopName, shops);
        await updateStockMessage(shops);
        await interaction.editReply({ content: `🗑️ Item **${name}** removed from shop **${shopName}**.` });
        return;
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
            const cartsData = loadData(CART_FILE);
            const userCart = cartsData[userId] || [];
            if (userCart.length) {
              const shopsData = loadData(SHOPS_FILE);
              userCart.forEach(entry => {
                const shop = shopsData[entry.shop];
                if (shop) {
                  const item = shop.items.find(i => i.normalizedName === normalizeName(entry.name));
                  if (item) item.quantity += entry.quantity;
                }
              });
              delete cartsData[userId];
              saveData(SHOPS_FILE, shopsData);
              saveData(CART_FILE, cartsData);
              for (const shopName of new Set(userCart.map(entry => entry.shop))) {
                await updateShopMessage(shopName, shopsData);
              }
              await updateStockMessage(shopsData);
            }
            channel.delete().catch(() => {});
          }, 12 * 3600000);
        }
        await updateCartMessage(channel, userId, cartsData, shops);
        await interaction.editReply({ content: `🆗 Your cart has been sent to ${channel}.` });
        return;
      }

      if (cmd === 'itemstock') {
        const itemsInStock = Object.entries(shops).flatMap(([shop, data]) =>
          data.items.map(item => [shop, item])
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
        const message = await interaction.editReply({ embeds: [embed] });
        const stockMessages = loadData(STOCK_MESSAGES_FILE);
        stockMessages[interaction.channelId] = message.id;
        saveData(STOCK_MESSAGES_FILE, stockMessages);
        return;
      }

      if (cmd === 'deleteitem') {
        const shopName = normalizeName(interaction.options.getString('shop'));
        if (!shopName) {
          await interaction.editReply({ content: '❌ Invalid shop name.' });
          return;
        }
        const name = interaction.options.getString('name');
        const normalizedName = normalizeName(name);
        if (!normalizedName) {
          await interaction.editReply({ content: '❌ Invalid item name.' });
          return;
        }
        const shop = shops[shopName];
        if (!shop) {
          await interaction.editReply({ content: `❌ Shop **${shopName}** not found.` });
          return;
        }
        const itemIndex = shop.items.findIndex(i => i.normalizedName === normalizedName);
        if (itemIndex === -1) {
          await interaction.editReply({ content: `❌ Item **${name}** not found in shop **${shopName}**.` });
          return;
        }
        shop.items.splice(itemIndex, 1);
        saveData(SHOPS_FILE, shops);
        await updateShopMessage(shopName, shops);
        await updateStockMessage(shops);
        await interaction.editReply({ content: `🗑️ Item **${name}** deleted from shop **${shopName}**.` });
        return;
      }

      await interaction.editReply({ content: '❌ Command not recognized.' });
      return;
    }

    if (interaction.isStringSelectMenu()) {
      const shopName = interaction.customId.replace('shop_select_', '');
      const shop = shops[shopName];
      if (!shop) {
        console.error(`Shop not found for select: ${shopName}, shops:`, Object.keys(shops));
        await interaction.reply({ content: `❌ Shop **${shopName}** not found.`, ephemeral: true });
        return;
      }
      const itemName = interaction.values[0];
      const item = shop.items.find(i => i.normalizedName === itemName);
      if (!item) {
        console.error(`Item not found for select: ${itemName} in shop ${shopName}, items:`, shop.items.map(i => i.normalizedName));
        await interaction.reply({ content: `❌ Item **${itemName}** not found in shop **${shopName}**.`, ephemeral: true });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(item.name)
        .setDescription(`Price: $${item.price.toFixed(2)}\nStock: ${item.quantity}${item.quantity === 0 ? ' (Out of stock)' : ''}`);
      if (item.image) embed.setImage(item.image);
      await interaction.update({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`add_${shopName}_${item.normalizedName}`)
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
      return;
    }

    if (interaction.isButton()) {
      await interaction.deferReply({ ephemeral: true });
      const parts = interaction.customId.split('_');
      const action = parts[0];
      const shopName = parts[1];
      const userIdFromButton = action === 'buy' || action === 'cancel' || action === 'sold' || action === 'confirm' ? parts[parts.length - 1] : null;
      const itemName = action === 'add' || action === 'remove' ? parts.slice(2).join('_') : null;

      if (action === 'buy' && interaction.customId.startsWith('buy_cart_')) {
        if (userId !== userIdFromButton) {
          await interaction.editReply({ content: '❌ This is not your cart.' });
          return;
        }
        const cart = carts[userId] || [];
        if (!cart.length) {
          await interaction.editReply({ content: '❌ Your cart is empty.' });
          return;
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
          const shop = shops[entry.shop];
          if (!shop) continue;
          const item = shop.items.find(i => i.normalizedName === normalizeName(entry.name));
          if (!item) continue;
          const lineTotal = item.price * entry.quantity;
          totalUSD += lineTotal;
          embed.addFields({
            name: `${entry.name} (${entry.shop})`,
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
        await interaction.editReply({ content: `✅ Order ticket created: ${ticketChannel}.` });
        return;
      }

      if (action === 'cancel') {
        if (userId !== userIdFromButton && userId !== OWNER_ID && (!STAFF_ROLE_ID || !interaction.member.roles.cache.has(STAFF_ROLE_ID))) {
          await interaction.editReply({ content: '❌ You don\'t have permission to cancel this order.' });
          return;
        }
        const cart = carts[userIdFromButton] || [];
        if (!cart.length) {
          await interaction.editReply({ content: '❌ Cart is empty.' });
          return;
        }

        cart.forEach(entry => {
          const shop = shops[entry.shop];
          if (shop) {
            const item = shop.items.find(i => i.normalizedName === normalizeName(entry.name));
            if (item) item.quantity += entry.quantity;
          }
        });
        delete carts[userIdFromButton];
        saveData(SHOPS_FILE, shops);
        saveData(CART_FILE, carts);

        const cartChannel = interaction.guild.channels.cache.find(c => c.name === `cart-${userIdFromButton}` && c.type === ChannelType.GuildText);
        if (cartChannel) await cartChannel.delete().catch(() => {});
        if (interaction.channel.name.startsWith('ticket-')) await interaction.channel.delete().catch(() => {});

        const updatedShops = new Set(cart.map(entry => entry.shop));
        for (const shopName of updatedShops) {
          await updateShopMessage(shopName, shops);
        }
        await updateStockMessage(shops);

        await interaction.editReply({ content: '🗑️ Order cancelled and stock restored.' });
        return;
      }

      if (action === 'sold') {
        if (userId !== userIdFromButton && userId !== OWNER_ID && (!STAFF_ROLE_ID || !interaction.member.roles.cache.has(STAFF_ROLE_ID))) {
          await interaction.editReply({ content: '❌ You don\'t have permission to mark this order as sold.' });
          return;
        }
        const cart = carts[userIdFromButton] || [];
        if (!cart.length) {
          await interaction.editReply({ content: '❌ Cart is empty.' });
          return;
        }

        const mentionMessage = await interaction.channel.send({ content: `<@${userIdFromButton}> Please wait patiently while your order is being prepared.` });
        setTimeout(() => {
          mentionMessage.edit({ content: 'Please wait patiently while your order is being prepared.' }).catch(() => {});
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

        const updatedShops = new Set(cart.map(entry => entry.shop));
        for (const shopName of updatedShops) {
          await updateShopMessage(shopName, shops);
        }
        await updateStockMessage(shops);

        await interaction.editReply({ content: '✅ Order marked as sold, please confirm to finalize.' });
        return;
      }

      if (action === 'confirm' && interaction.customId.startsWith('confirm_final_')) {
        if (userId !== userIdFromButton && userId !== OWNER_ID && (!STAFF_ROLE_ID || !interaction.member.roles.cache.has(STAFF_ROLE_ID))) {
          await interaction.editReply({ content: '❌ You don\'t have permission to finalize this order.' });
          return;
        }
        const cart = carts[userIdFromButton] || [];
        if (!cart.length) {
          await interaction.editReply({ content: '❌ Cart is empty.' });
          return;
        }

        delete carts[userIdFromButton];
        saveData(CART_FILE, carts);

        const cartChannel = interaction.guild.channels.cache.find(c => c.name === `cart-${userIdFromButton}` && c.type === ChannelType.GuildText);
        if (cartChannel) await cartChannel.delete().catch(() => {});
        if (interaction.channel.name.startsWith('ticket-')) await interaction.channel.delete().catch(() => {});

        const updatedShops = new Set(cart.map(entry => entry.shop));
        for (const shopName of updatedShops) {
          await updateShopMessage(shopName, shops);
        }
        await updateStockMessage(shops);

        await interaction.editReply({ content: '✅ Order finalized.' });
        return;
      }

      if (action === 'add') {
        const shop = shops[shopName];
        if (!shop) {
          console.error(`Shop not found for add: ${shopName}, shops:`, Object.keys(shops));
          await interaction.editReply({ content: `❌ Shop **${shopName}** not found.` });
          return;
        }
        const item = shop.items.find(i => i.normalizedName === itemName);
        if (!item) {
          console.error(`Item not found for add: ${itemName} in shop ${shopName}, items:`, shop.items.map(i => i.normalizedName));
          await interaction.editReply({ content: `❌ Item **${itemName}** not found in shop **${shopName}**.` });
          return;
        }
        if (!item.quantity) {
          await interaction.editReply({ content: '⚠️ Out of stock.' });
          return;
        }
        item.quantity--;
        saveData(SHOPS_FILE, shops);
        let userCart = carts[userId] || [];
        let entry = userCart.find(e => e.shop === shopName && e.normalizedName === itemName);
        if (entry) entry.quantity++;
        else userCart.push({ shop: shopName, name: item.name, normalizedName: itemName, quantity: 1 });
        carts[userId] = userCart;
        saveData(CART_FILE, carts);
        const channel = interaction.guild.channels.cache.find(c => c.name === `cart-${userId}` && c.type === ChannelType.GuildText);
        if (channel) await updateCartMessage(channel, userId, carts, shops);
        await updateShopMessage(shopName, shops);
        await updateStockMessage(shops);
        await interaction.editReply({ content: `✅ Item **${item.name}** added to cart. Stock: ${item.quantity}` });
        return;
      }

      if (action === 'back') {
        const shop = shops[shopName];
        if (!shop) {
          console.error(`Shop not found for back: ${shopName}, shops:`, Object.keys(shops));
          await interaction.editReply({ content: `❌ Shop **${shopName}** not found.` });
          return;
        }
        const items = shop.items || [];
        if (!items.length) {
          await interaction.editReply({ content: `❌ Shop **${shopName}** is empty.` });
          return;
        }
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
          .addOptions(items.map(i => ({
            label: i.name + (i.quantity === 0 ? ' (Out of stock)' : ''),
            description: `Price: $${i.price.toFixed(2)}${i.quantity <= 5 ? ` (Low stock: ${i.quantity})` : ''}`,
            value: i.normalizedName
          })));
        const menuEmbed = new EmbedBuilder()
          .setColor('Green')
          .setDescription('Select an item below to view details.');

        await interaction.update({
          embeds: [stockEmbed, menuEmbed],
          components: [new ActionRowBuilder().addComponents(menu)]
        });
        return;
      }

      if (action === 'remove') {
        const shop = shops[shopName];
        if (!shop) {
          console.error(`Shop not found for remove: ${shopName}, shops:`, Object.keys(shops));
          await interaction.editReply({ content: `❌ Shop **${shopName}** not found.` });
          return;
        }
        const item = shop.items.find(i => i.normalizedName === itemName);
        if (!item) {
          console.error(`Item not found for remove: ${itemName} in shop ${shopName}, items:`, shop.items.map(i => i.normalizedName));
          await interaction.editReply({ content: `❌ Item **${itemName}** not found in shop **${shopName}**.` });
          return;
        }
        let userCart = carts[userId] || [];
        const entry = userCart.find(e => e.shop === shopName && e.normalizedName === itemName);
        if (!entry) {
          await interaction.editReply({ content: `❌ Item **${itemName}** not in your cart.` });
          return;
        }
        item.quantity += 1;
        if (entry.quantity > 1) {
          entry.quantity -= 1;
        } else {
          userCart = userCart.filter(e => !(e.shop === shopName && e.normalizedName === itemName));
        }
        if (userCart.length === 0) {
          delete carts[userId];
        } else {
          carts[userId] = userCart;
        }
        saveData(SHOPS_FILE, shops);
        saveData(CART_FILE, carts);
        const channel = interaction.guild.channels.cache.find(c => c.name === `cart-${userId}` && c.type === ChannelType.GuildText);
        if (channel) await updateCartMessage(channel, userId, carts, shops);
        await updateShopMessage(shopName, shops);
        await updateStockMessage(shops);
        await interaction.editReply({ content: `🗑️ Removed 1 **${item.name}** from cart.` });
        return;
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ An error occurred while processing your request.', ephemeral: true }).catch(() => {});
    } else if (interaction.deferred) {
      await interaction.editReply({ content: '❌ An error occurred while processing your request.' }).catch(() => {});
    }
  }
});

client.on('error', error => {
  console.error('Client error:', error);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('Failed to login:', error);
});