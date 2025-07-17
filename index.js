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
const STAFF_ROLE_ID = ''; // Remplace par l'ID du rôle staff, ou laisse vide si aucun rôle staff
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const SHOPS_FILE = './shops.json';
const CART_FILE = './cart.json';
const SHOP_MESSAGES_FILE = './shopMessages.json';
const STOCK_MESSAGES_FILE = './stockMessages.json';

function loadData(path) {
  try {
    return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf-8')) : {};
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
      const item = shop.items.find(i => i.name === entry.name);
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
        if (!shop) continue;
        const item = shop.items.find(i => i.name === entry.name);
        if (!item) continue;
        const lineTotal = item.price * entry.quantity;
        totalUSD += lineTotal;
        embed.addFields({
          name: `${entry.name} (${entry.shop})`,
          value: `Quantity: ${entry.quantity}\nPrice: $${item.price.toFixed(2)}\nSubtotal: $${lineTotal.toFixed(2)}`
        });
        if (item.image && !embed.data.image) embed.setImage(item.image);
        if (validItemIndex % 5 === 0) {
          components.push(new ActionRowBuilder());
        }
        components[Math.floor(validItemIndex / 5)].addComponents(
          new ButtonBuilder()
            .setCustomId(`remove_${entry.shop}_${entry.name}`)
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
    console.error('Error updating cart message:', error);
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
          label: i.quantity === 0 ? `${i.name} (Out of stock)` : i.name,
          description: `Price: $${i.price.toFixed(2)}${i.quantity <= 5 ? ` (Low stock: ${i.quantity})` : ''}`,
          value: i.name
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
      console.error(`Error updating shop message for ${shopName}:`, error);
      delete shopMessages[shopName];
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
        }
      } catch (error) {
        console.error(`Error updating stock message for channel ${channelId}:`, error);
        delete stockMessages[channelId];
      }
    }
    saveData(STOCK_MESSAGES_FILE, stockMessages);
  } catch (error) {
    console.error('Error in updateStockMessage:', error);
  }
}

client.once('ready', async () => {
  console.log('✅ Logged in as ' + client.user.tag);
  try {
    const shops = loadData(SHOPS_FILE);
    const carts = loadData(CART_FILE);
    cleanCart(carts, shops);

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
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Error in ready event:', error);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;
    const userId = interaction.user.id;
    const shops = loadData(SHOPS_FILE);
    let carts = loadData(CART_FILE);
    carts = cleanCart(carts, shops);

    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;
      if (userId !== OWNER_ID && cmd !== 'cart' && cmd !== 'shop' && cmd !== 'shoplist' && cmd !== 'itemstock') {
        return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (cmd === 'createshop') {
        const name = interaction.options.getString('name');
        const image = interaction.options.getString('image') || null;
        if (shops[name]) {
          return interaction.reply({ content: `❌ Shop **${name}** already exists.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        shops[name] = { items: [], image };
        saveData(SHOPS_FILE, shops);
        return interaction.reply({ content: `✅ Shop **${name}** created.`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (cmd === 'deleteshop') {
        const name = interaction.options.getString('name');
        if (!shops[name]) {
          return interaction.reply({ content: `❌ Shop **${name}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        delete shops[name];
        saveData(SHOPS_FILE, shops);
        const shopMessages = loadData(SHOP_MESSAGES_FILE);
        delete shopMessages[name];
        saveData(SHOP_MESSAGES_FILE, shopMessages);
        await updateStockMessage(shops);
        return interaction.reply({ content: `🗑️ Shop **${name}** deleted.`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (cmd === 'shoplist') {
        const names = Object.keys(shops);
        if (!names.length) {
          return interaction.reply({ content: '🚫 No shops available.', ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        return interaction.reply({ content: `📋 Shops: ${names.map(n => `**${n}**`).join(', ')}`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (cmd === 'shop') {
        const shopName = interaction.options.getString('name');
        const shop = shops[shopName];
        if (!shop) {
          return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        const items = shop.items || [];
        if (!items.length) {
          return interaction.reply({ content: `🚫 Shop **${shopName}** is empty.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
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
              label: i.quantity === 0 ? `${i.name} (Out of stock)` : i.name,
              description: `Price: $${i.price.toFixed(2)}${i.quantity <= 5 ? ` (Low stock: ${i.quantity})` : ''}`,
              value: i.name
            }))
          );

        const menuEmbed = new EmbedBuilder()
          .setColor('Green')
          .setDescription('Select an item below to view details.');

        const message = await interaction.reply({
          embeds: [stockEmbed, menuEmbed],
          components: [new ActionRowBuilder().addComponents(menu)],
          fetchReply: true,
          ephemeral: false
        });

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
          return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        shop.items.push({ name, price, quantity, image });
        saveData(SHOPS_FILE, shops);
        await updateShopMessage(shopName, shops);
        await updateStockMessage(shops);
        return interaction.reply({ content: `✅ Item **${name}** added to shop **${shopName}**.`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (cmd === 'edititem') {
        const shopName = interaction.options.getString('shop');
        const name = interaction.options.getString('name');
        const shop = shops[shopName];
        if (!shop) {
          return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        const item = shop.items.find(i => i.name === name);
        if (!item) {
          return interaction.reply({ content: `❌ Item **${name}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
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
        return interaction.reply({ content: `✅ Item **${name}** updated in shop **${shopName}**.`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (cmd === 'removeitem') {
        const shopName = interaction.options.getString('shop');
        const name = interaction.options.getString('name');
        const shop = shops[shopName];
        if (!shop) {
          return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        const filtered = shop.items.filter(i => i.name !== name);
        shops[shopName].items = filtered;
        saveData(SHOPS_FILE, shops);
        await updateShopMessage(shopName, shops);
        await updateStockMessage(shops);
        return interaction.reply({ content: `🗑️ Item **${name}** removed from shop **${shopName}**.`, ephemeral: true })
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
            try {
              const cartsData = loadData(CART_FILE);
              const userCart = cartsData[userId] || [];
              if (userCart.length) {
                const shopsData = loadData(SHOPS_FILE);
                userCart.forEach(entry => {
                  const shop = shopsData[entry.shop];
                  if (shop) {
                    const item = shop.items.find(i => i.name === entry.name);
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
              await channel.delete().catch(() => {});
            } catch (error) {
              console.error(`Error in cart timeout for user ${userId}:`, error);
            }
          }, 12 * 3600000);
        }
        await updateCartMessage(channel, userId, cartsData, shops);
        return interaction.reply({ content: `🆗 Your cart has been sent to ${channel}.`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
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
        const message = await interaction.reply({ embeds: [embed], fetchReply: true, ephemeral: false });
        const stockMessages = loadData(STOCK_MESSAGES_FILE);
        stockMessages[interaction.channelId] = message.id;
        saveData(STOCK_MESSAGES_FILE, stockMessages);
      }
    }

    if (interaction.isStringSelectMenu()) {
      const shopName = interaction.customId.replace('shop_select_', '');
      const shop = shops[shopName];
      if (!shop) {
        return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const item = shop.items.find(i => i.name === interaction.values[0]);
      if (!item) {
        return interaction.reply({ content: `❌ Item **${interaction.values[0]}** not found.`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(item.name)
        .setDescription(`Price: $${item.price.toFixed(2)}\nStock: ${item.quantity}${item.quantity === 0 ? ' (Out of stock)' : ''}`);
      if (item.image) embed.setImage(item.image);
      return interaction.update({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`add_${shopName}_${item.name}`)
              .setLabel(item.quantity > 0 ? 'Add to cart' : 'Out of stock')
              .setDisabled(item.quantity === 0)
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`back_${shopName}`)
              .setLabel('Back')
              .setStyle(ButtonStyle.Secondary)
          )
        ],
        ephemeral: true
      });
    }

    if (interaction.isButton()) {
      const [action, ...rest] = interaction.customId.split('_');
      const userIdFromButton = rest[rest.length - 1];
      const shopName = action === 'buy' || action === 'remove' ? rest[0] : rest.slice(0, -1).join('_');
      const itemName = action === 'buy' ? null : rest.slice(1, -1).join('_');

      if (action === 'buy' && interaction.customId.startsWith('buy_cart_')) {
        if (userId !== userIdFromButton) {
          return interaction.reply({ content: '❌ This is not your cart.', ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        const cart = carts[userId] || [];
        if (!cart.length) {
          return interaction.reply({ content: '❌ Your cart is empty.', ephemeral: true })
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
          const shop = shops[entry.shop];
          if (!shop) continue;
          const item = shop.items.find(i => i.name === entry.name);
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
        return interaction.reply({ content: `✅ Order ticket created: ${ticketChannel}.`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (action === 'cancel') {
        if (userId !== userIdFromButton && userId !== OWNER_ID && (!STAFF_ROLE_ID || !interaction.member.roles.cache.has(STAFF_ROLE_ID))) {
          return interaction.reply({ content: '❌ You don\'t have permission to cancel this order.', ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        const cart = carts[userIdFromButton] || [];
        if (!cart.length) {
          return interaction.reply({ content: '❌ Cart is empty.', ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }

        cart.forEach(entry => {
          const shop = shops[entry.shop];
          if (shop) {
            const item = shop.items.find(i => i.name === entry.name);
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

        return interaction.reply({ content: '🗑️ Order cancelled and stock restored.', ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (action === 'sold') {
        if (userId !== userIdFromButton && userId !== OWNER_ID && (!STAFF_ROLE_ID || !interaction.member.roles.cache.has(STAFF_ROLE_ID))) {
          return interaction.reply({ content: '❌ You don\'t have permission to mark this order as sold.', ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        const cart = carts[userIdFromButton] || [];
        if (!cart.length) {
          return interaction.reply({ content: '❌ Cart is empty.', ephemeral: true })
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

        const updatedShops = new Set(cart.map(entry => entry.shop));
        for (const shopName of updatedShops) {
          await updateShopMessage(shopName, shops);
        }
        await updateStockMessage(shops);

        return interaction.reply({ content: '✅ Order marked as sold, please confirm to finalize.', ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (action === 'confirm' && interaction.customId.startsWith('confirm_final_')) {
        if (userId !== userIdFromButton && userId !== OWNER_ID && (!STAFF_ROLE_ID || !interaction.member.roles.cache.has(STAFF_ROLE_ID))) {
          return interaction.reply({ content: '❌ You don\'t have permission to finalize this order.', ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        const cart = carts[userIdFromButton] || [];
        if (!cart.length) {
          return interaction.reply({ content: '❌ Cart is empty.', ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
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

        return interaction.reply({ content: '✅ Order finalized.', ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (action === 'add') {
        const shop = shops[shopName];
        if (!shop) {
          return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        const item = shop.items.find(i => i.name === itemName);
        if (!item) {
          return interaction.reply({ content: `❌ Item **${itemName}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        if (!item.quantity) {
          return interaction.reply({ content: '⚠️ Out of stock.', ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        item.quantity--;
        saveData(SHOPS_FILE, shops);
        let userCart = carts[userId] || [];
        let entry = userCart.find(e => e.shop === shopName && e.name === itemName);
        if (entry) entry.quantity++;
        else userCart.push({ shop: shopName, name: itemName, quantity: 1 });
        carts[userId] = userCart;
        saveData(CART_FILE, carts);
        const channel = interaction.guild.channels.cache.find(c => c.name === `cart-${userId}` && c.type === ChannelType.GuildText);
        if (channel) await updateCartMessage(channel, userId, carts, shops);
        await updateShopMessage(shopName, shops);
        await updateStockMessage(shops);
        return interaction.reply({ content: `✅ Item **${itemName}** added to cart. Stock: ${item.quantity}`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }

      if (action === 'back') {
        const shop = shops[shopName];
        if (!shop) {
          return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        const items = shop.items;
        if (!items.length) {
          return interaction.reply({ content: `❌ Shop **${shopName}** is empty.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
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
            label: i.quantity === 0 ? `${i.name} (Out of stock)` : i.name,
            description: `Price: $${i.price.toFixed(2)}${i.quantity <= 5 ? ` (Low stock: ${i.quantity})` : ''}`,
            value: i.name
          })));
        const menuEmbed = new EmbedBuilder()
          .setColor('Green')
          .setDescription('Select an item below to view details.');

        return interaction.update({
          embeds: [stockEmbed, menuEmbed],
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true
        });
      }

      if (action === 'remove') {
        const shop = shops[shopName];
        if (!shop) {
          return interaction.reply({ content: `❌ Shop **${shopName}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        const item = shop.items.find(i => i.name === itemName);
        if (!item) {
          return interaction.reply({ content: `❌ Item **${itemName}** not found.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        let userCart = carts[userId] || [];
        const entry = userCart.find(e => e.shop === shopName && e.name === itemName);
        if (!entry) {
          return interaction.reply({ content: `❌ Item **${itemName}** not in your cart.`, ephemeral: true })
            .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }
        item.quantity += 1;
        if (entry.quantity > 1) {
          entry.quantity -= 1;
        } else {
          userCart = userCart.filter(e => !(e.shop === shopName && e.name === itemName));
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
        return interaction.reply({ content: `🗑️ Removed 1 **${itemName}** from cart.`, ephemeral: true })
          .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
      }
    }
  } catch (error) {
    console.error('Error in interactionCreate:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ An error occurred.', ephemeral: true })
        .then(reply => setTimeout(() => reply.delete().catch(() => {}), 5000));
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('Error logging in to Discord:', error);
});