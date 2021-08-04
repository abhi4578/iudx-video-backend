import { Kafka, Consumer, Producer, Admin } from 'kafkajs';
import { Service } from 'typedi';

import config from '../config';
import UUID from '../common/UUID';

@Service()
export default class KafkaManager {
    private kafka: Kafka;
    private kafkaConsumer: Consumer;
    private kafkaProducer: Producer;
    private kafkaAdmin: Admin;

    constructor() { }

    public connect() {
        this.kafka = new Kafka({
            clientId: config.kafkaConfig.clientId,
            brokers: [config.kafkaConfig.brokers],
        });
        Object.freeze(this.kafka);
    }

    public async subscribe(topic: string, callback: any) {
        try {
            this.kafkaConsumer = this.kafka.consumer({ groupId: config.serverId });
            await this.kafkaConsumer.connect();
            await this.kafkaConsumer.subscribe({ topic });
            await this.kafkaConsumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    for (let [key, value] of Object.entries(message.headers)) {
                        message.headers[key] = value.toString();
                    }
                    callback(null, message);
                },
            });
        } catch (err) {
            callback(err);
        }
    }

    public async publish(topic: string, message: any, messageType: string, messageId?: string) {
        try {
            if (!messageId) {
                const namespace: string = config.host.type + 'KafkaMsg';
                messageId = new UUID().generateUUIDv5(namespace);
            }
            const msg = JSON.stringify(message);
            this.kafkaProducer = this.kafka.producer();
            await this.kafkaProducer.connect();
            const record = await this.kafkaProducer.send({
                topic,
                messages: [
                    {
                        value: msg,
                        headers: { messageId, messageType }
                    }
                ],
            });
            return { messageId, record };
        } catch (err) {
            throw err;
        }
    }

    public async listTopics() {
        try {
            this.kafkaAdmin = this.kafka.admin();
            await this.kafkaAdmin.connect();
            const topics = await this.kafkaAdmin.listTopics();
            await this.kafkaAdmin.disconnect();
            return topics;
        }
        catch (err) {
            throw err;
        }
    }

    public async unsubscribe() {
        try {
            if (this.kafkaConsumer) {
                await this.kafkaConsumer.disconnect();
            }
        }
        catch (err) {
            throw err;
        }
    }
}
